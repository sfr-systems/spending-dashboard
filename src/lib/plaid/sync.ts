import { db } from "@/lib/db";
import { getPlaidClient } from "@/lib/plaid/client";
import { decryptAccessToken } from "@/lib/plaid/crypto";
import { buildCleanedDescription, buildDerivedCategory } from "@/lib/csv/enrich";
import { inferTransactionType } from "@/lib/csv/normalize";
import type { Transaction as PlaidTxn, RemovedTransaction } from "plaid";

export type SyncSummary = {
  itemId: string;
  added: number;
  modified: number;
  removed: number;
};

type SyncableItem = {
  id: string;
  userId: string;
  accessTokenCiphertext: string;
  cursor: string | null;
  accounts: { id: string; plaidAccountId: string }[];
};

export async function syncItem(item: SyncableItem): Promise<SyncSummary> {
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

  const addedRows = added
    .map((t) => {
      const localAccountId = accountByPlaidId.get(t.account_id);
      return localAccountId ? rowFromPlaid(item.userId, localAccountId, t) : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await db.$transaction(
    async (tx) => {
      // Bulk insert. skipDuplicates relies on @@unique([userId, plaidTransactionId]).
      if (addedRows.length > 0) {
        await tx.transaction.createMany({ data: addedRows, skipDuplicates: true });
      }

      // Modified rows: typically small; per-row upsert is fine.
      for (const t of modified) {
        const localAccountId = accountByPlaidId.get(t.account_id);
        if (!localAccountId) continue;
        const row = rowFromPlaid(item.userId, localAccountId, t);
        await tx.transaction.upsert({
          where: {
            userId_plaidTransactionId: {
              userId: item.userId,
              plaidTransactionId: t.transaction_id,
            },
          },
          create: row,
          update: row,
        });
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
    },
    // Large initial syncs (24 months of history) can take longer than the
    // 5-second default. Allow up to 60s of execution and 15s of wait.
    { timeout: 60_000, maxWait: 15_000 },
  );

  return {
    itemId: item.id,
    added: added.length,
    modified: modified.length,
    removed: removed.length,
  };
}

function rowFromPlaid(userId: string, plaidAccountLocalId: string, t: PlaidTxn) {
  // Plaid: positive amount = money out (debit). We flip to match our convention:
  // negative = money out (expense), positive = money in (credit).
  const amount = -t.amount;
  const description = t.name ?? t.merchant_name ?? "";
  const dateStr = t.date;
  const transactionDate = new Date(dateStr + "T00:00:00.000Z");
  const postedDate = t.authorized_date
    ? new Date(t.authorized_date + "T00:00:00.000Z")
    : null;

  const originalCategory = (
    t.personal_finance_category?.primary ||
    t.category?.[0] ||
    "Uncategorized"
  ).toString();

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
