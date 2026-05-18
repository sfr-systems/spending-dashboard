import { createHash } from "crypto";
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";
import { getPlaidClient } from "@/lib/plaid/client";

// In-memory cache of verification keys by kid. Plaid rotates keys periodically;
// expired ones are still returned by /webhook_verification_key/get for some time
// to allow verification of in-flight events.
const keyCache = new Map<string, JWK>();

const MAX_CLOCK_SKEW_SEC = 5 * 60;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function verifyPlaidWebhook(
  headerJwt: string | null,
  rawBody: string,
): Promise<VerifyResult> {
  if (!headerJwt) {
    return { ok: false, reason: "Missing plaid-verification header" };
  }

  let header: ReturnType<typeof decodeProtectedHeader>;
  try {
    header = decodeProtectedHeader(headerJwt);
  } catch {
    return { ok: false, reason: "Malformed JWT header" };
  }

  if (header.alg !== "ES256") {
    return { ok: false, reason: `Unexpected alg: ${header.alg}` };
  }
  const kid = header.kid;
  if (!kid) {
    return { ok: false, reason: "Missing kid in JWT header" };
  }

  let jwk = keyCache.get(kid);
  if (!jwk) {
    try {
      const plaid = getPlaidClient();
      const resp = await plaid.webhookVerificationKeyGet({ key_id: kid });
      jwk = resp.data.key as unknown as JWK;
      keyCache.set(kid, jwk);
    } catch (err) {
      return {
        ok: false,
        reason: `Failed to fetch verification key: ${err instanceof Error ? err.message : "unknown"}`,
      };
    }
  }

  let payload: Record<string, unknown>;
  try {
    const key = await importJWK(jwk, "ES256");
    const verified = await jwtVerify(headerJwt, key, { algorithms: ["ES256"] });
    payload = verified.payload as Record<string, unknown>;
  } catch (err) {
    return {
      ok: false,
      reason: `JWT signature invalid: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const iat = typeof payload.iat === "number" ? payload.iat : null;
  if (iat == null) {
    return { ok: false, reason: "Missing iat" };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - iat) > MAX_CLOCK_SKEW_SEC) {
    return { ok: false, reason: "iat outside allowed clock skew window" };
  }

  const expectedHash = typeof payload.request_body_sha256 === "string"
    ? payload.request_body_sha256
    : null;
  if (!expectedHash) {
    return { ok: false, reason: "Missing request_body_sha256 claim" };
  }
  const actualHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  if (actualHash !== expectedHash) {
    return { ok: false, reason: "Body hash mismatch" };
  }

  return { ok: true };
}
