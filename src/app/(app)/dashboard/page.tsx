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
import { CleanedDataToggle } from "@/components/dashboard/CleanedDataToggle";
import { ClientOnly } from "@/components/dashboard/ClientOnly";
import { WaveDivider } from "@/components/dashboard/WaveDivider";
import { StarBackground } from "@/components/dashboard/StarBackground";
import { SummaryCharts } from "@/components/dashboard/SummaryCharts";
import { SpendingBySourceSection } from "@/components/dashboard/SpendingBySourceSection";
import type { SourceTransaction } from "@/components/dashboard/SpendingBySourceSection";
import {
  computeSummary,
  computeByCategory,
  computeByMonth,
  computeStackedByMonth,
  computeStackedByWeek,
  periodStart,
  toMonthKey,
} from "@/lib/dashboard";

export const metadata = { title: "Dashboard — SpendWise" };

interface PageProps {
  searchParams: Promise<{ period?: string; income?: string; cleaned?: string; from?: string; to?: string }>;
}

export default async function DashboardPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // On a fresh load (no period param), restore the user's last saved period.
  if (!searchParams.period) {
    const pref = await db.userPreference.findUnique({
      where: { userId: session.user.id },
      select: { data: true },
    });
    const saved = (pref?.data as { dashboardPeriod?: { period?: string; from?: string; to?: string } } | null)
      ?.dashboardPeriod;
    if (saved?.period && saved.period !== "all") {
      const qs = new URLSearchParams();
      qs.set("period", saved.period);
      if (saved.from) qs.set("from", saved.from);
      if (saved.to) qs.set("to", saved.to);
      if (searchParams.income) qs.set("income", searchParams.income);
      if (searchParams.cleaned) qs.set("cleaned", searchParams.cleaned);
      redirect(`/dashboard?${qs.toString()}`);
    }
  }

  const period = searchParams.period ?? "all";
  const includeIncome = searchParams.income === "1";
  const cleanedData = searchParams.cleaned !== "0";

  let since: Date | null = null;
  let until: Date | null = null;
  if (period === "custom" && searchParams.from && searchParams.to) {
    since = new Date(`${searchParams.from}T00:00:00Z`);
    until = new Date(`${searchParams.to}T23:59:59.999Z`);
  } else {
    since = periodStart(period);
  }

  const raw = await db.transaction.findMany({
    where: {
      userId: session.user.id,
      NOT: { file: { frozen: true } },
      ...(since || until ? {
        transactionDate: {
          ...(since ? { gte: since } : {}),
          ...(until ? { lte: until } : {}),
        },
      } : {}),
    },
    select: {
      transactionDate: true,
      amount: true,
      category: true,
      derivedCategory: true,
      transactionType: true,
      description: true,
      cleanedDescription: true,
    },
  });

  const transactions = raw.map((t) => ({
    transactionDate: t.transactionDate,
    amount: t.amount.toNumber(),
    category: cleanedData
      ? t.derivedCategory || t.category
      : t.category,
    transactionType: t.transactionType,
  }));

  const summary = computeSummary(transactions);
  const byCategory = computeByCategory(transactions);
  const monthlyData = computeStackedByMonth(transactions, includeIncome, since, until);
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

  // Build serializable source transactions for the SpendingBySource section
  const sourceTxns: SourceTransaction[] = raw.map((t) => ({
    date: t.transactionDate.toISOString(),
    amount: t.amount.toNumber(),
    source: cleanedData
      ? t.cleanedDescription || t.description
      : t.description,
  }));

  const allSources = Array.from(
    new Set(
      sourceTxns.filter((t) => t.amount < 0).map((t) => t.source)
    )
  ).sort();

  // Global data range from all spending transactions so the timeline in
  // SpendingBySource stays consistent regardless of which source is selected.
  const spendingKeys = sourceTxns
    .filter((t) => t.amount < 0)
    .map((t) => toMonthKey(new Date(t.date)));
  const globalDataStart = spendingKeys.length > 0
    ? spendingKeys.reduce((a, b) => (a < b ? a : b))
    : undefined;
  const globalDataEnd = spendingKeys.length > 0
    ? spendingKeys.reduce((a, b) => (a > b ? a : b))
    : undefined;

  // Effective bounds: period start/end take priority; global data range is the fallback.
  const periodBoundStart = since ? toMonthKey(since) : globalDataStart;
  const periodBoundEnd = until
    ? toMonthKey(until)
    : since
    ? toMonthKey(new Date())
    : globalDataEnd;

  const isEmpty = transactions.length === 0;

  return (
    <div className="relative isolate flex flex-col gap-4">
      <StarBackground />
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
            <CleanedDataToggle />
          </Suspense>
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

          <ClientOnly fallbackHeight="h-10 my-8">
            <WaveDivider className="my-8" scrollOffset={0} />
          </ClientOnly>

          {/* Section 2: Timeline analysis */}
          <div className="rounded-xl border border-border bg-card p-5">
            <ClientOnly fallbackHeight="h-72">
              <StackedSpendingChart
                monthlyData={monthlyData}
                weeklyData={weeklyData}
                includeIncome={includeIncome}
              />
            </ClientOnly>
          </div>

          <ClientOnly fallbackHeight="h-10 my-8">
            <WaveDivider className="my-8" scrollOffset={1257} />
          </ClientOnly>

          {/* Section 3: Category analysis */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Top categories
            </h2>
            <ClientOnly fallbackHeight="h-64">
              <TopCategoriesSection data={byCategory} />
            </ClientOnly>
          </div>

          <ClientOnly fallbackHeight="h-10 my-8">
            <WaveDivider className="my-8" scrollOffset={2513} />
          </ClientOnly>

          {/* Section 4: Spending by source */}
          <div className="rounded-xl border border-border bg-card p-5">
            <ClientOnly fallbackHeight="h-40">
              <SpendingBySourceSection
                allSources={allSources}
                transactions={sourceTxns}
                cleanedData={cleanedData}
                periodBoundStart={periodBoundStart}
                periodBoundEnd={periodBoundEnd}
              />
            </ClientOnly>
          </div>
        </div>
      )}
    </div>
  );
}
