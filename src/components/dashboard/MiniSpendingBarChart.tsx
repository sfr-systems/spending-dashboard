"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface DataPoint {
  label: string;
  spent: number;
}

interface Props {
  data: DataPoint[];
}

export function MiniSpendingBarChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow text-xs">
                <p className="font-semibold mb-1">{label}</p>
                <p>{formatCurrency(Number(payload[0]?.value))}</p>
              </div>
            );
          }}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
        />
        <Bar
          dataKey="spent"
          fill="#6366f1"
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
