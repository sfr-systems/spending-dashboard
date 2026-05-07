import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { TopCategoriesSection } from "@/components/dashboard/TopCategoriesSection";
import { StackedSpendingChart } from "@/components/dashboard/StackedSpendingChart";
import { IncomeToggle } from "@/components/dashboard/IncomeToggle";
import { ClientOnly } from "@/components/dashboard/ClientOnly";
import { WaveDivider } from "@/components/dashboard/WaveDivider";
import { SummaryCharts } from "@/components/dashboard/SummaryCharts";
import {
  computeSummary,
  computeByCategory,
  computeByMonth,
  computeStackedByMonth,
  computeStackedByWeek,
  periodStart,
} from "@/lib/dashboard";

export const metadata = { title: "Dashboard — SpendWise" };

interface PageProps {
  searchParams: { period?: string; income?: string };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const period = searchParams.period ?? "all";
  const includeIncome = searchParams.income === "1";
  const since = periodStart(period);

  const raw = await db.transaction.findMany({
    where: {
      userId: session.user.id,
      ...(since ? { transactionDate: { gte: since } } : {}),
    },
    select: {
      transactionDate: true,
      amount: true,
      category: true,
      transactionType: true,
    },
  });

  const transactions = raw.map((t) => ({
    transactionDate: t.transactionDate,
    amount: t.amount.toNumber(),
    category: t.category,
    transactionType: t.transactionType,
  }));

  const summary = computeSummary(transactions);
  const byCategory = computeByCategory(transactions);
  const monthlyData = computeStackedByMonth(transactions, includeIncome);
  const weeklyData = computeStackedByWeek(transactions, includeIncome);

  // Mini bar chart: last 12 months
  const allMonths = computeByMonth(transactions);
  const last12 = allMonths.slice(-12).map((m) => ({
    label: m.month.split(" ")[0],
    spent: m.spent,
  }));

  // Mini pie chart: top 4 categories + "Other"
  const top4 = byCategory.slice(0, 4);
  const otherTotal = byCategory.slice(4).reduce((s, c) => s + c.total, 0);
  const miniPieData = [
    ...top4.map((c) => ({ name: c.category, value: c.total })),
    ...(otherTotal > 0 ? [{ name: "Other", value: otherTotal, isOther: true }] : []),
  ];

  const isEmpty = transactions.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEmpty
              ? "Upload CSV files to see your spending insights."
              : `${transactions.length.toLocaleString()} transactions`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense>
            <IncomeToggle />
          </Suspense>
          <Suspense>
            <PeriodSelector />
          </Suspense>
        </div>
      </div>

      {/* Section 1: Summary cards + mini charts */}
      <SummaryCards summary={summary} />

      {!isEmpty && (
        <div className="flex flex-col gap-4">
          <ClientOnly fallbackHeight="h-40">
            <SummaryCharts barData={last12} pieData={miniPieData} />
          </ClientOnly>

          <WaveDivider className="my-8" />

          {/* Section 2: Timeline analysis */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Spending by category
            </h2>
            <ClientOnly fallbackHeight="h-72">
              <StackedSpendingChart
                monthlyData={monthlyData}
                weeklyData={weeklyData}
                includeIncome={includeIncome}
              />
            </ClientOnly>
          </div>

          <WaveDivider className="my-8" />

          {/* Section 3: Category analysis */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Top categories
            </h2>
            <ClientOnly fallbackHeight="h-64">
              <TopCategoriesSection data={byCategory} />
            </ClientOnly>
          </div>
        </div>
      )}
    </div>
  );
}
