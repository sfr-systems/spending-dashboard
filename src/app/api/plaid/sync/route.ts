import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaidClient } from "@/lib/plaid/client";
import { decryptAccessToken } from "@/lib/plaid/crypto";
import { buildCleanedDescription, buildDerivedCategory } from "@/lib/csv/enrich";
import { inferTransactionType } from "@/lib/csv/normalize";
import type { Transaction as PlaidTxn, RemovedTransaction } from "plaid";

type SyncSummary = { itemId: string; added: number; modified: number; removed: number };

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

async function syncItem(item: {
  id: string;
  userId: string;
  accessTokenCiphertext: string;
  cursor: string | null;
  accounts: { id: string; plaidAccountId: string }[];
}): Promise<SyncSummary> {
  const plaid = getPlaidClient();
  const accessToken = decryptAccessToken(item.accessTokenCiphertext);
  const accountByPlaidId = new Map(item.accounts.map((a) => [a.plaidAccountId, a.id]));

  let cursor: string | undefined = item.cursor ?? undefined;
  let added: PlaidTxn[] = [];
  let modified: PlaidTxn[] = [];
  let removed: RemovedTransaction[] = [];
  let hasMore = true;

  while (hasMore) {
    const resp = await plaid.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    });
    added = added.concat(resp.data.added);
    modified = modified.concat(resp.data.modified);
    removed = removed.concat(resp.data.removed);
    hasMore = resp.data.has_more;
    cursor = resp.data.next_cursor;
  }

  await db.$transaction(async (tx) => {
    for (const t of added) {
      const localAccountId = accountByPlaidId.get(t.account_id);
      if (!localAccountId) continue;
      await tx.transaction.create({
        data: rowFromPlaid(item.userId, localAccountId, t),
      });
    }

    for (const t of modified) {
      const localAccountId = accountByPlaidId.get(t.account_id);
      if (!localAccountId) continue;
      const existing = await tx.transaction.findUnique({
        where: { userId_plaidTransactionId: { userId: item.userId, plaidTransactionId: t.transaction_id } },
        select: { id: true },
      });
      if (existing) {
        await tx.transaction.update({
          where: { id: existing.id },
          data: rowFromPlaid(item.userId, localAccountId, t),
        });
      } else {
        await tx.transaction.create({
          data: rowFromPlaid(item.userId, localAccountId, t),
        });
      }
    }

    if (removed.length > 0) {
      await tx.transaction.deleteMany({
        where: {
          userId: item.userId,
          plaidTransactionId: { in: removed.map((r) => r.transaction_id) },
        },
      });
    }

    await tx.plaidItem.update({
      where: { id: item.id },
      data: {
        cursor: cursor ?? null,
        lastSyncedAt: new Date(),
        lastSyncError: null,
        status: "active",
      },
    });
  });

  return { itemId: item.id, added: added.length, modified: modified.length, removed: removed.length };
}

function rowFromPlaid(userId: string, plaidAccountLocalId: string, t: PlaidTxn) {
  // Plaid: positive amount = money out (debit). We flip to match our convention:
  // negative = money out (expense), positive = money in (credit).
  const amount = -t.amount;
  const description = t.name ?? t.merchant_name ?? "";
  const dateStr = t.date;
  const transactionDate = new Date(dateStr + "T00:00:00.000Z");
  const postedDate = t.authorized_date ? new Date(t.authorized_date + "T00:00:00.000Z") : null;

  const originalCategory = (t.personal_finance_category?.primary || t.category?.[0] || "Uncategorized").toString();

  return {
    userId,
    source: "plaid",
    plaidAccountId: plaidAccountLocalId,
    plaidTransactionId: t.transaction_id,
    transactionDate,
    postedDate,
    description,
    cleanedDescription: buildCleanedDescription(description),
    merchant: t.merchant_name ?? null,
    amount,
    category: originalCategory,
    derivedCategory: buildDerivedCategory(description, originalCategory),
    transactionType: inferTransactionType(amount),
    accountName: null,
    notes: null,
    rawData: t as unknown as object,
  };
}
