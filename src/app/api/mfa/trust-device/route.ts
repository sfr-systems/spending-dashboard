import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createTrustedDevice,
  hashTrustedDeviceToken,
  trustedDeviceCookieOptions,
} from "@/lib/mfa/trustedDevice";
import { TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_DAYS } from "@/lib/mfa/trustedDeviceConstants";

// Remember the current browser so future sign-ins can skip the MFA code.
// Called by the login page right after a successful code entry.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mfaEnabledAt: true },
  });
  if (!user?.mfaEnabledAt) {
    return NextResponse.json(
      { error: "Two-factor authentication is not enabled." },
      { status: 400 },
    );
  }

  // Replace any token this browser already holds instead of accumulating rows.
  const existing = req.cookies.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (existing) {
    await db.trustedDevice.deleteMany({
      where: { userId, tokenHash: hashTrustedDeviceToken(existing) },
    });
  }

  const { token, expiresAt, label } = await createTrustedDevice(
    userId,
    req.headers.get("user-agent"),
  );
  const res = NextResponse.json({
    ok: true,
    label,
    expiresAt: expiresAt.toISOString(),
    days: TRUSTED_DEVICE_DAYS,
  });
  res.cookies.set(TRUSTED_DEVICE_COOKIE, token, trustedDeviceCookieOptions());
  return res;
}
