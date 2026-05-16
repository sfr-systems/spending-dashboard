import { encryptWithKey, decryptWithKey } from "@/lib/crypto";

const ENV = "MFA_ENCRYPTION_KEY";

export function encryptMfaSecret(plaintext: string): string {
  return encryptWithKey(plaintext, process.env.MFA_ENCRYPTION_KEY, ENV);
}

export function decryptMfaSecret(ciphertext: string): string {
  return decryptWithKey(ciphertext, process.env.MFA_ENCRYPTION_KEY, ENV);
}
