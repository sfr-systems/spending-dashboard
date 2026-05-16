import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.plaidItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { accounts: { select: { id: true, name: true, mask: true, subtype: true } } },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      institutionName: i.institutionName,
      status: i.status,
      lastSyncedAt: i.lastSyncedAt?.toISOString() ?? null,
      lastSyncError: i.lastSyncError,
      accounts: i.accounts,
    })),
  });
}
