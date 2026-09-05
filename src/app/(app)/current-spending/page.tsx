import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyTransactionRules, getUserRules } from "@/lib/rules";
import { buildCurrentSpendingData, sanitizePrefs, toDayKey } from "@/lib/currentSpending";
import { CurrentSpendingClient } from "@/components/current-spending/CurrentSpendingClient";

export const metadata = { title: "Current Spending — SpendWise" };

export default async function CurrentSpendingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [rawAll, rules, pref, plaidSync] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        NOT: { file: { frozen: true } },
        excludedFromDashboard: false,
      },
      select: {
        transactionDate: true,
        amount: true,
        category: true,
        derivedCategory: true,
        description: true,
        cleanedDescription: true,
      },
    }),
    getUserRules(userId),
    db.userPreference.findUnique({
      where: { userId },
      select: { data: true },
    }),
    db.plaidItem.aggregate({
      where: { userId },
      _count: { _all: true },
      _max: { lastSyncedAt: true },
    }),
  ]);

  // Same read-time rules and "cleaned" categories the Dashboard uses, so the
  // numbers here line up with what the user sees there.
  const ruled = applyTransactionRules(rawAll, rules);
  const data = buildCurrentSpendingData(
    ruled.map((t) => ({
      day: toDayKey(t.transactionDate),
      amount: t.amount.toNumber(),
      category: t.derivedCategory || t.category,
    })),
  );

  const stored = (pref?.data as { currentSpending?: unknown } | null)?.currentSpending;
  const prefs = sanitizePrefs(stored);

  return (
    <CurrentSpendingClient
      data={data}
      initialPrefs={prefs}
      todayKey={toDayKey(new Date())}
      hasBankConnection={plaidSync._count._all > 0}
      lastSyncedAt={plaidSync._max.lastSyncedAt ? plaidSync._max.lastSyncedAt.toISOString() : null}
    />
  );
}
