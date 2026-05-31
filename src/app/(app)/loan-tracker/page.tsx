import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyTransactionRules, getUserRules } from "@/lib/rules";
import { computeAverageMonthlyInterest, computeMonthlyInterest } from "@/lib/loan";
import { LoanTrackerClient } from "@/components/loan-tracker/LoanTrackerClient";

export const metadata = { title: "Loan Tracker — SpendWise" };

const INTEREST_KEY = "PURCHASE INTEREST CHARGE";

export default async function LoanTrackerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [rawAll, rules, loan] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        NOT: { file: { frozen: true } },
        excludedFromDashboard: false,
      },
      select: {
        transactionDate: true,
        amount: true,
        description: true,
        cleanedDescription: true,
        derivedCategory: true,
      },
    }),
    getUserRules(userId),
    db.loan.findUnique({
      where: { userId },
      include: { payments: { orderBy: { paymentDate: "asc" } } },
    }),
  ]);

  const filtered = applyTransactionRules(rawAll, rules).filter(
    (t) => (t.cleanedDescription || "").toUpperCase() === INTEREST_KEY,
  );

  const monthly = computeMonthlyInterest(
    filtered.map((t) => ({ transactionDate: t.transactionDate, amount: t.amount.toNumber() })),
  );

  const suggestion = computeAverageMonthlyInterest(monthly);

  const loanSerialized = loan
    ? {
        id: loan.id,
        initialAmount: loan.initialAmount.toNumber(),
        startDate: loan.startDate.toISOString(),
        avgMonthlyCharge: loan.avgMonthlyCharge.toNumber(),
        payments: loan.payments.map((p) => ({
          id: p.id,
          amount: p.amount.toNumber(),
          paymentDate: p.paymentDate.toISOString(),
        })),
      }
    : null;

  return (
    <LoanTrackerClient
      monthly={monthly}
      averageInterestSuggestion={suggestion}
      loan={loanSerialized}
    />
  );
}
