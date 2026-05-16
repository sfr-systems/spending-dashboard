import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTotpSecret, buildOtpAuthUrl } from "@/lib/mfa/totp";
import { encryptMfaSecret } from "@/lib/mfa/crypto";

// Generates a candidate TOTP secret, stores its ciphertext on the user, and
// returns the QR code for enrollment. MFA is NOT enabled until /enable is
// called with a valid first code. Re-calling /setup overwrites any pending
// (not-yet-confirmed) secret, which is what we want.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, mfaEnabledAt: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.mfaEnabledAt) {
    return NextResponse.json({ error: "MFA is already enabled. Disable it first to re-enroll." }, { status: 409 });
  }

  const secret = generateTotpSecret();
  await db.user.update({
    where: { id: session.user.id },
    data: { mfaSecretCiphertext: encryptMfaSecret(secret) },
  });

  const { otpAuthUrl, qrCodeDataUrl } = await buildOtpAuthUrl(user.email, secret);

  return NextResponse.json({
    manualKey: secret,
    otpAuthUrl,
    qrCodeDataUrl,
  });
}
