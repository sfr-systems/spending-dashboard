import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTotp, generateBackupCodes, hashBackupCode } from "@/lib/mfa/totp";
import { decryptMfaSecret } from "@/lib/mfa/crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const code: string | undefined = body?.code;
  if (typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecretCiphertext: true, mfaEnabledAt: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.mfaEnabledAt) {
    return NextResponse.json({ error: "MFA is already enabled." }, { status: 409 });
  }
  if (!user.mfaSecretCiphertext) {
    return NextResponse.json({ error: "Call /api/mfa/setup first." }, { status: 400 });
  }

  const secret = decryptMfaSecret(user.mfaSecretCiphertext);
  if (!verifyTotp(code, secret)) {
    return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });
  }

  const backupCodes = generateBackupCodes();
  const hashes = await Promise.all(backupCodes.map((c) => hashBackupCode(c)));

  await db.$transaction([
    db.user.update({
      where: { id: session.user.id },
      data: { mfaEnabledAt: new Date() },
    }),
    db.mfaBackupCode.deleteMany({ where: { userId: session.user.id } }),
    db.mfaBackupCode.createMany({
      data: hashes.map((h) => ({ userId: session.user.id, codeHash: h })),
    }),
  ]);

  return NextResponse.json({ backupCodes });
}
