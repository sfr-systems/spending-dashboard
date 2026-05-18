import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPasswordAndMfaCode } from "@/lib/mfa/verify";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const password: string | undefined = body?.password;
    const code: string | undefined = body?.code;
    if (typeof password !== "string" || !password || typeof code !== "string" || !code) {
      return NextResponse.json({ error: "password and code are required" }, { status: 400 });
    }

    const result = await verifyPasswordAndMfaCode(session.user.id, password, code);
    if (!result.ok) {
      if (result.reason === "not_enrolled") {
        return NextResponse.json({ error: "MFA is not enabled." }, { status: 400 });
      }
      return NextResponse.json(
        { error: result.reason === "password" ? "Invalid password." : "Invalid code." },
        { status: 400 }
      );
    }

    await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: { mfaSecretCiphertext: null, mfaEnabledAt: null },
      }),
      db.mfaBackupCode.deleteMany({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mfa/disable]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error disabling MFA" },
      { status: 500 }
    );
  }
}
