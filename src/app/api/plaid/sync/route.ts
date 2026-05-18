import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncItem, type SyncSummary } from "@/lib/plaid/sync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const onlyItemId: string | undefined = body?.itemId;

  const items = await db.plaidItem.findMany({
    where: { userId, ...(onlyItemId ? { id: onlyItemId } : {}) },
    include: { accounts: true },
  });

  if (items.length === 0) {
    return NextResponse.json({ summaries: [] });
  }

  const summaries: SyncSummary[] = [];

  for (const item of items) {
    try {
      const summary = await syncItem(item);
      summaries.push(summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      await db.plaidItem.update({
        where: { id: item.id },
        data: { lastSyncError: msg, status: "error" },
      });
      summaries.push({ itemId: item.id, added: 0, modified: 0, removed: 0 });
    }
  }

  return NextResponse.json({ summaries });
}
