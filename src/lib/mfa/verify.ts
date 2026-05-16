import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { decryptMfaSecret } from "@/lib/mfa/crypto";
import { compareBackupCode, verifyTotp } from "@/lib/mfa/totp";

export type MfaCheckResult = { ok: true } | { ok: false; reason: "password" | "code" | "not_enrolled" };

// Verifies a user's password + a TOTP code (or backup code). On a successful
// backup-code match, the code is consumed (marked used) atomically.
export async function verifyPasswordAndMfaCode(
  userId: string,
  password: string,
  code: string
): Promise<MfaCheckResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, mfaEnabledAt: true, mfaSecretCiphertext: true },
  });
  if (!user || !user.passwordHash) return { ok: false, reason: "password" };
  if (!user.mfaEnabledAt || !user.mfaSecretCiphertext) return { ok: false, reason: "not_enrolled" };

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false, reason: "password" };
  }

  const secret = decryptMfaSecret(user.mfaSecretCiphertext);
  if (verifyTotp(code, secret)) return { ok: true };

  // Try backup code.
  const unused = await db.mfaBackupCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  });
  for (const candidate of unused) {
    if (await compareBackupCode(code, candidate.codeHash)) {
      const consumed = await db.mfaBackupCode.updateMany({
        where: { id: candidate.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count === 1) return { ok: true };
    }
  }

  return { ok: false, reason: "code" };
}
