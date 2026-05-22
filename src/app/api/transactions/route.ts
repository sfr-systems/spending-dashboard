import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { applyTransactionRules, getUserRules } from "@/lib/rules";
import { detectRecurringIds } from "@/lib/recurring";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [rawTransactions, files, plaidItems, rules] = await Promise.all([
    db.transaction.findMany({
      where: { userId, NOT: { file: { frozen: true } } },
      orderBy: { transactionDate: "desc" },
      select: {
        id: true,
        source: true,
        transactionDate: true,
        description: true,
        cleanedDescription: true,
        merchant: true,
        amount: true,
        category: true,
        derivedCategory: true,
        transactionType: true,
        accountName: true,
        excludedFromDashboard: true,
        file: { select: { id: true, originalFilename: true } },
        plaidAccount: { select: { item: { select: { id: true, institutionName: true } } } },
      },
    }),
    db.uploadedFile.findMany({
      where: { userId, uploadStatus: "parsed", frozen: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, originalFilename: true },
    }),
    db.plaidItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, institutionName: true },
    }),
    getUserRules(userId),
  ]);

  const afterRules = applyTransactionRules(rawTransactions.map((t) => {
    const isPlaid = t.source === "plaid";
    const sourceId = isPlaid ? t.plaidAccount?.item.id ?? null : t.file?.id ?? null;
    const sourceLabel = isPlaid
      ? t.plaidAccount?.item.institutionName ?? null
      : t.file?.originalFilename ?? null;
    return {
      id: t.id,
      source: t.source,
      transactionDate: t.transactionDate.toISOString(),
      description: t.description,
      cleanedDescription: t.cleanedDescription,
      merchant: t.merchant,
      amount: t.amount.toNumber(),
      category: t.category,
      derivedCategory: t.derivedCategory,
      transactionType: t.transactionType,
      accountName: t.accountName,
      excludedFromDashboard: t.excludedFromDashboard,
      sourceId,
      sourceLabel,
    };
  }), rules);

  const recurringIds = detectRecurringIds(afterRules);
  const transactions = afterRules.map((t) => ({
    ...t,
    isRecurring: recurringIds.has(t.id),
  }));

  const sources = [
    ...plaidItems.map((i) => ({ id: i.id, label: i.institutionName, kind: "bank" as const })),
    ...files.map((f) => ({ id: f.id, label: f.originalFilename, kind: "csv" as const })),
  ];

  const categories = Array.from(
    new Set(transactions.map((t) => t.category).filter(Boolean))
  ).sort() as string[];

  return NextResponse.json({ transactions, categories, sources });
}
