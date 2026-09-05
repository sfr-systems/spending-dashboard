import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashTrustedDeviceToken, trustedDeviceCookieOptions } from "@/lib/mfa/trustedDevice";
import { TRUSTED_DEVICE_COOKIE } from "@/lib/mfa/trustedDeviceConstants";

// Forget a single remembered device. Scoped to the signed-in user.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;

  const device = await db.trustedDevice.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, tokenHash: true },
  });
  if (!device) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.trustedDevice.delete({ where: { id: device.id } });

  const res = NextResponse.json({ ok: true });
  const cookieToken = req.cookies.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (cookieToken && hashTrustedDeviceToken(cookieToken) === device.tokenHash) {
    res.cookies.set(TRUSTED_DEVICE_COOKIE, "", trustedDeviceCookieOptions(0));
  }
  return res;
}
