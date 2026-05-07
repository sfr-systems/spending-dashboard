"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyTotal } from "@/lib/dashboard";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface Props {
  data: MonthlyTotal[];
}

export function MonthlyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap="30%">
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) =>
            v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
          }
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            name === "spent" ? "Spent" : "Income",
          ]}
          contentStyle={{ fontSize: 13, borderRadius: 8 }}
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Legend
          formatter={(value) => (value === "spent" ? "Spent" : "Income")}
          wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
        />
        <Bar dataKey="spent" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
