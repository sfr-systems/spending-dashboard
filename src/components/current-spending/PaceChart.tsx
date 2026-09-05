"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaceRow, ViewMode } from "@/lib/currentSpending";
import { fmtUSD0, fmtUSDCompact } from "./format";

interface Props {
  rows: PaceRow[];
  view: ViewMode;
  benchmark: number | null;
  elapsedDays: number;
  spent: number;
}

const CURRENT_COLOR = "#8b5cf6";
const BENCHMARK_COLOR = "#22c55e";

export function PaceChart({ rows, view, benchmark, elapsedDays, spent }: Props) {
  const noun = view === "week" ? "week" : "month";
  const hasTypical = rows.some((r) => r.typical !== null);
  const endLabel = rows[Math.min(rows.length, elapsedDays) - 1]?.label;

  return (
    <div>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="currentSpendingPaceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CURRENT_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CURRENT_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              interval={view === "week" ? 0 : 4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtUSDCompact(v)}
              width={46}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as PaceRow | undefined;
                if (!row) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow">
                    <p className="mb-1 font-semibold">
                      {view === "week" ? row.label : `Day ${row.label}`}
                    </p>
                    {row.current !== null && <p>This {noun}: {fmtUSD0(row.current)}</p>}
                    {row.typical !== null && (
                      <p className="text-muted-foreground">Typical: {fmtUSD0(row.typical)}</p>
                    )}
                  </div>
                );
              }}
            />
            {benchmark !== null && benchmark > 0 && (
              <ReferenceLine
                y={benchmark}
                stroke={BENCHMARK_COLOR}
                strokeDasharray="2 4"
                ifOverflow="extendDomain"
              />
            )}
            {hasTypical && (
              <Line
                type="monotone"
                dataKey="typical"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="current"
              stroke={CURRENT_COLOR}
              strokeWidth={2.5}
              fill="url(#currentSpendingPaceFill)"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            {endLabel !== undefined && (
              <ReferenceDot
                x={endLabel}
                y={spent}
                r={4}
                fill={CURRENT_COLOR}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: CURRENT_COLOR }} />
          This {noun}
        </span>
        {hasTypical && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-muted-foreground" />
            Typical {noun}
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
