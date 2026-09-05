// Client-safe constants for the "remember this device" MFA feature.
// Kept separate from trustedDevice.ts, which imports the database client.
export const TRUSTED_DEVICE_COOKIE = "spendwise_trusted_device";
export const TRUSTED_DEVICE_DAYS = 30;
