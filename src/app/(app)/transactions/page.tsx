import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import type { TransactionRow } from "@/components/transactions/columns";
import { applyTransactionRules, getUserRules } from "@/lib/rules";

export const metadata = { title: "Transactions — SpendWise" };

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

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

  const transactions: TransactionRow[] = applyTransactionRules(rawTransactions.map((t) => {
    const isPlaid = t.source === "plaid";
    return {
      id: t.id,
      source: t.source as "csv" | "plaid",
      transactionDate: t.transactionDate.toISOString(),
      description: t.description,
      cleanedDescription: t.cleanedDescription,
      merchant: t.merchant,
      amount: t.amount.toNumber(),
      category: t.category,
      derivedCategory: t.derivedCategory,
      transactionType: t.transactionType,
      accountName: t.accountName,
      sourceId: isPlaid ? t.plaidAccount?.item.id ?? null : t.file?.id ?? null,
      sourceLabel: isPlaid
        ? t.plaidAccount?.item.institutionName ?? null
        : t.file?.originalFilename ?? null,
    };
  }), rules);

  const sources = [
    ...plaidItems.map((i) => ({ id: i.id, label: i.institutionName, kind: "bank" as const })),
    ...files.map((f) => ({ id: f.id, label: f.originalFilename, kind: "csv" as const })),
  ];

  const categories = Array.from(
    new Set(transactions.map((t) => t.category).filter(Boolean))
  ).sort();

  const sourceSummary = (() => {
    const fileN = files.length;
    const bankN = plaidItems.length;
    const parts: string[] = [];
    if (bankN > 0) parts.push(`${bankN} bank${bankN === 1 ? "" : "s"}`);
    if (fileN > 0) parts.push(`${fileN} file${fileN === 1 ? "" : "s"}`);
    return parts.join(" and ");
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {transactions.length === 0
            ? "Connect a bank or upload a CSV to see your transactions here."
            : `${transactions.length.toLocaleString()} transaction${transactions.length === 1 ? "" : "s"}${sourceSummary ? ` across ${sourceSummary}` : ""}.`}
        </p>
      </div>

      <TransactionsTable
        transactions={transactions}
        categories={categories}
        sources={sources}
      />
    </div>
  );
}
