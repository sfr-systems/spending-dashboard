import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_DAYS } from "@/lib/mfa/trustedDeviceConstants";

const MS_DAY = 86_400_000;

export function generateTrustedDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

// The token has 256 bits of entropy, so a plain SHA-256 is enough to keep a
// database leak from yielding usable cookies.
export function hashTrustedDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function trustedDeviceCookieOptions(maxAgeSeconds = TRUSTED_DEVICE_DAYS * 86_400) {
  const base = process.env.NEXTAUTH_URL ?? "";
  const secure = base ? base.startsWith("https://") : process.env.NODE_ENV === "production";
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: maxAgeSeconds };
}

/** Pull the trusted-device token out of a raw Cookie header. */
export function readTrustedDeviceToken(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== TRUSTED_DEVICE_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/** Short human label like "Safari on iPhone" for the Security page list. */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS/.test(ua)
        ? "Firefox"
        : /CriOS|Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  return `${browser} on ${os}`;
}

/** Returns the device row when the token belongs to this user and hasn't expired. */
export async function findValidTrustedDevice(userId: string, token: string) {
  const device = await db.trustedDevice.findUnique({
    where: { tokenHash: hashTrustedDeviceToken(token) },
  });
  if (!device || device.userId !== userId) return null;
  if (device.expiresAt.getTime() <= Date.now()) {
    await db.trustedDevice.delete({ where: { id: device.id } }).catch(() => {});
    return null;
  }
  return device;
}

export async function createTrustedDevice(
  userId: string,
  userAgent: string | null | undefined,
): Promise<{ token: string; expiresAt: Date; label: string }> {
  const token = generateTrustedDeviceToken();
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * MS_DAY);
  const label = describeUserAgent(userAgent);
  await db.trustedDevice.create({
    data: { userId, tokenHash: hashTrustedDeviceToken(token), label, expiresAt },
  });
  return { token, expiresAt, label };
}

export async function revokeAllTrustedDevices(userId: string): Promise<number> {
  const result = await db.trustedDevice.deleteMany({ where: { userId } });
  return result.count;
}
