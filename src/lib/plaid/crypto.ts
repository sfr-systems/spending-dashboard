import { encryptWithKey, decryptWithKey } from "@/lib/crypto";

const ENV = "PLAID_TOKEN_ENCRYPTION_KEY";

export function encryptAccessToken(plaintext: string): string {
  return encryptWithKey(plaintext, process.env.PLAID_TOKEN_ENCRYPTION_KEY, ENV);
}

export function decryptAccessToken(ciphertext: string): string {
  return decryptWithKey(ciphertext, process.env.PLAID_TOKEN_ENCRYPTION_KEY, ENV);
}
