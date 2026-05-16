import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const transactions = rawTransactions.map((t) => ({
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
  ).sort() as string[];

  return NextResponse.json({ transactions, categories, files });
}
