import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const ISSUER = "SpendWise";

export function generateTotpSecret(): string {
  return speakeasy.generateSecret({ length: 20 }).base32;
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    // window: 1 = accept current ±30s for clock skew.
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: token.replace(/\s+/g, ""),
      window: 1,
    });
  } catch {
    return false;
  }
}

export async function buildOtpAuthUrl(
  email: string,
  secret: string
): Promise<{ otpAuthUrl: string; qrCodeDataUrl: string }> {
  const otpAuthUrl = speakeasy.otpauthURL({
    secret,
    encoding: "base32",
    label: encodeURIComponent(email),
    issuer: ISSUER,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, { margin: 1, width: 240 });
  return { otpAuthUrl, qrCodeDataUrl };
}

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_BYTES = 5;

export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const raw = randomBytes(BACKUP_CODE_BYTES).toString("hex");
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export async function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(normalizeBackupCode(code), 10);
}

export async function compareBackupCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalizeBackupCode(code), hash);
}

export function normalizeBackupCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, "");
}
