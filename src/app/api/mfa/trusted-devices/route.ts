import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  hashTrustedDeviceToken,
  revokeAllTrustedDevices,
  trustedDeviceCookieOptions,
} from "@/lib/mfa/trustedDevice";
import { TRUSTED_DEVICE_COOKIE } from "@/lib/mfa/trustedDeviceConstants";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieToken = req.cookies.get(TRUSTED_DEVICE_COOKIE)?.value;
  const currentHash = cookieToken ? hashTrustedDeviceToken(cookieToken) : null;

  const rows = await db.trustedDevice.findMany({
    where: { userId: session.user.id, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
  });

  return NextResponse.json({
    devices: rows.map((d) => ({
      id: d.id,
      label: d.label,
      createdAt: d.createdAt.toISOString(),
      lastUsedAt: d.lastUsedAt.toISOString(),
      expiresAt: d.expiresAt.toISOString(),
      current: currentHash !== null && d.tokenHash === currentHash,
    })),
  });
}

// Forget every remembered device for this user.
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const removed = await revokeAllTrustedDevices(session.user.id);
  const res = NextResponse.json({ ok: true, removed });
  res.cookies.set(TRUSTED_DEVICE_COOKIE, "", trustedDeviceCookieOptions(0));
  return res;
}
