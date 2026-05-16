import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function keyFromHex(hex: string | undefined, envName: string): Buffer {
  if (!hex) throw new Error(`${envName} is not set`);
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error(`${envName} must be 32 bytes (64 hex chars)`);
  return key;
}

export function encryptWithKey(plaintext: string, keyHex: string | undefined, envName: string): string {
  const key = keyFromHex(keyHex, envName);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptWithKey(ciphertext: string, keyHex: string | undefined, envName: string): string {
  const key = keyFromHex(keyHex, envName);
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
