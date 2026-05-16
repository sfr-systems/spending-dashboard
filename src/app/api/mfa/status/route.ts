import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabledAt: true, mfaBackupCodes: { where: { usedAt: null }, select: { id: true } } },
  });

  return NextResponse.json({
    enabled: !!user?.mfaEnabledAt,
    enabledAt: user?.mfaEnabledAt?.toISOString() ?? null,
    unusedBackupCodes: user?.mfaBackupCodes.length ?? 0,
  });
}
