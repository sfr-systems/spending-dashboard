import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getPlaidClient } from "@/lib/plaid/client";
import { decryptAccessToken } from "@/lib/plaid/crypto";
import { verifyPasswordAndMfaCode } from "@/lib/mfa/verify";
import { revokeAllTrustedDevices, trustedDeviceCookieOptions } from "@/lib/mfa/trustedDevice";
import { TRUSTED_DEVICE_COOKIE } from "@/lib/mfa/trustedDeviceConstants";

const MIN_PASSWORD_LEN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, createdAt: true, mfaEnabledAt: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    mfaEnabled: !!user.mfaEnabledAt,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword: string | undefined = body?.currentPassword;
  const newEmail: string | undefined = body?.newEmail;
  const newPassword: string | undefined = body?.newPassword;

  if (typeof currentPassword !== "string" || !currentPassword) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }
  if (newEmail === undefined && newPassword === undefined) {
    return NextResponse.json({ error: "Provide newEmail or newPassword." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const updates: { email?: string; passwordHash?: string } = {};

  if (typeof newEmail === "string" && newEmail.trim() !== "") {
    const normalized = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const taken = await db.user.findFirst({
      where: { email: normalized, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
    updates.email = normalized;
  }

  if (typeof newPassword === "string" && newPassword !== "") {
    if (newPassword.length < MIN_PASSWORD_LEN) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LEN} characters.` },
        { status: 400 }
      );
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await db.user.update({ where: { id: session.user.id }, data: updates });
  const res = NextResponse.json({ ok: true, updated: Object.keys(updates) });
  if (updates.passwordHash) {
    // A new password should force the MFA code again everywhere.
    await revokeAllTrustedDevices(session.user.id);
    res.cookies.set(TRUSTED_DEVICE_COOKIE, "", trustedDeviceCookieOptions(0));
  }
  return res;
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const password: string | undefined = body?.password;
  const mfaCode: string | undefined = body?.mfaCode;
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, mfaEnabledAt: true },
  });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.mfaEnabledAt) {
    if (typeof mfaCode !== "string" || !mfaCode) {
      return NextResponse.json(
        { error: "Authentication code is required to delete an MFA-protected account." },
        { status: 400 }
      );
    }
    const check = await verifyPasswordAndMfaCode(userId, password, mfaCode);
    if (!check.ok) {
      return NextResponse.json(
        { error: check.reason === "password" ? "Password is incorrect." : "Invalid authentication code." },
        { status: 400 }
      );
    }
  } else {
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 400 });
    }
  }

  // Best-effort: tell Plaid to invalidate access tokens on their side. The DB
  // delete below cascades regardless of whether these calls succeed.
  const plaidItems = await db.plaidItem.findMany({
    where: { userId },
    select: { id: true, accessTokenCiphertext: true },
  });
  if (plaidItems.length > 0) {
    const plaid = getPlaidClient();
    await Promise.all(
      plaidItems.map(async (item) => {
        try {
          const token = decryptAccessToken(item.accessTokenCiphertext);
          await plaid.itemRemove({ access_token: token });
        } catch {
          // Swallow — we still want to remove local data.
        }
      })
    );
  }

  await db.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
