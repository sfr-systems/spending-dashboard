import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { DashboardSummary } from "@/lib/dashboard";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

interface Props {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: Props) {
  const { totalSpent, totalIncome, net, transactionCount } = summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-destructive">
          {fmt(totalSpent)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{transactionCount} transactions</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Total Income</p>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-green-600">
          {fmt(totalIncome)}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
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
      </div>
    </div>
  );
}
