import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { DashboardSummary } from "@/lib/dashboard";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function SummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-pink-500/10 p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-violet-500/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-indigo-500/25 blur-3xl"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

interface Props {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: Props) {
  const { totalSpent, totalIncome, net, transactionCount } = summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-destructive">
          {fmt(totalSpent)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{transactionCount} transactions</p>
      </SummaryCard>

      <SummaryCard>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Total Income</p>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-green-600">
          {fmt(totalIncome)}
        </p>
      </SummaryCard>

      <SummaryCard>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Net</p>
          <Wallet className={`h-4 w-4 ${net >= 0 ? "text-green-600" : "text-destructive"}`} />
        </div>
        <p
          className={`mt-2 text-2xl font-semibold tabular-nums ${
            net >= 0 ? "text-green-600" : "text-destructive"
          }`}
        >
          {net >= 0 ? "+" : ""}
          {fmt(net)}
        </p>
      </SummaryCard>
    </div>
  );
}
