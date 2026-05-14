import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import type { TransactionRow } from "@/components/transactions/columns";

export const metadata = { title: "Transactions — SpendWise" };

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [rawTransactions, files] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      orderBy: { transactionDate: "desc" },
      select: {
        id: true,
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
      },
    }),
    db.uploadedFile.findMany({
      where: { userId, uploadStatus: "parsed" },
      orderBy: { createdAt: "desc" },
      select: { id: true, originalFilename: true },
    }),
  ]);

  // Serialize Prisma Decimal and Date to plain values for the client component
  const transactions: TransactionRow[] = rawTransactions.map((t) => ({
    id: t.id,
    transactionDate: t.transactionDate.toISOString(),
    description: t.description,
    cleanedDescription: t.cleanedDescription,
    merchant: t.merchant,
    amount: t.amount.toNumber(),
    category: t.category,
    derivedCategory: t.derivedCategory,
    transactionType: t.transactionType,
    accountName: t.accountName,
    filename: t.file.originalFilename,
    fileId: t.file.id,
  }));

  const categories = Array.from(
    new Set(transactions.map((t) => t.category).filter(Boolean))
  ).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {transactions.length === 0
            ? "Upload a CSV file to see your transactions here."
            : `${transactions.length.toLocaleString()} transaction${transactions.length === 1 ? "" : "s"} across ${files.length} file${files.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      <TransactionsTable
        transactions={transactions}
        categories={categories}
        files={files}
      />
    </div>
  );
}
