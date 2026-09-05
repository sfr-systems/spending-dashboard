"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RecentPeriod, ViewMode } from "@/lib/currentSpending";
import { fmtUSD0, fmtUSDCompact } from "./format";

interface Props {
  periods: RecentPeriod[];
  view: ViewMode;
  avgFull: number | null;
  benchmark: number | null;
}

const PRIOR_COLOR = "#6366f1";
const CURRENT_COLOR = "#ec4899";
const BENCHMARK_COLOR = "#22c55e";

// Recharts types label geometry as string | number | undefined; coerce locally.
type LabelProps = {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  value?: string | number | boolean | null;
};

const num = (v: string | number | boolean | null | undefined): number | null => {
  if (v == null || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

function renderValueLabel(props: LabelProps) {
  const x = num(props.x);
  const y = num(props.y);
  const width = num(props.width);
  const value = num(props.value);
  if (x == null || y == null || width == null || value == null || value <= 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="hsl(var(--muted-foreground))"
      fontSize={10}
      textAnchor="middle"
    >
      {fmtUSDCompact(value)}
    </text>
  );
}

export function RecentPeriodsChart({ periods, view, avgFull, benchmark }: Props) {
  const noun = view === "week" ? "week" : "month";

  if (periods.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Not enough history yet.
      </div>
    );
  }

  return (
    <div>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={periods} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtUSDCompact(v)}
              width={46}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as RecentPeriod | undefined;
                if (!row) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow">
                    <p className="mb-1 font-semibold">
                      {row.fullLabel}
                      {row.isCurrent ? " (so far)" : ""}
                    </p>
                    <p>Spent: {fmtUSD0(row.spent)}</p>
                    {row.vsAvg !== null && !row.isCurrent && (
                      <p className={row.vsAvg <= 0 ? "text-green-500" : "text-rose-500"}>
                        {fmtUSD0(Math.abs(row.vsAvg))} {row.vsAvg <= 0 ? "under" : "over"} average
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {avgFull !== null && avgFull > 0 && (
              <ReferenceLine
                y={avgFull}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}
            {benchmark !== null && benchmark > 0 && (
              <ReferenceLine
                y={benchmark}
                stroke={BENCHMARK_COLOR}
                strokeDasharray="2 4"
                ifOverflow="extendDomain"
              />
            )}
            <Bar dataKey="spent" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
              {periods.map((p) => (
                <Cell
                  key={p.key}
                  fill={p.isCurrent ? CURRENT_COLOR : PRIOR_COLOR}
                  fillOpacity={p.isCurrent ? 0.95 : 0.8}
                />
              ))}
              <LabelList dataKey="spent" position="top" content={renderValueLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PRIOR_COLOR }} />
          Prior {noun}s
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CURRENT_COLOR }} />
          This {noun} so far
        </span>
        {avgFull !== null && avgFull > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-muted-foreground" />
            Avg {fmtUSD0(avgFull)}
          </span>
        )}
        {benchmark !== null && benchmark > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dotted" style={{ borderColor: BENCHMARK_COLOR }} />
            Benchmark {fmtUSD0(benchmark)}
          </span>
        )}
      </div>
    </div>
  );
}
