"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  LabelList,
  ResponsiveContainer,
} from "recharts";

export type MonthlyBar = {
  monthKey: string;
  label: string;
  total: number;
};

interface Props {
  data: MonthlyBar[];
  avgMonthlyCharge: number | null;
  loanStartMonthKey: string | null;
}

const SPACER_KEY = "__loan_start_spacer__";
const SPACER_LABEL = "​"; // zero-width space

const COLOR_YELLOW = "#f59e0b";
const COLOR_GREEN = "#22c55e";
const COLOR_RED = "#ef4444";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

type ChartRow = {
  monthKey: string;
  label: string;
  // Pre-loan months put the whole value in `preSpend` (single yellow bar).
  // Post-loan months split the value into three stacked segments:
  //   spend = min(total, avg)
  //   gap   = max(0, avg - total)   (green — unspent up to avg)
  //   over  = max(0, total - avg)   (red  — overage above avg)
  preSpend: number;
  spend: number;
  gap: number;
  over: number;
  total: number; // actual spend
  isPostLoan: boolean;
  isSpacer?: boolean;
};

function buildRows(
  data: MonthlyBar[],
  avg: number | null,
  loanKey: string | null,
): { rows: ChartRow[]; hasSpacer: boolean } {
  const rows: ChartRow[] = [];
  let hasSpacer = false;
  for (const d of data) {
    if (loanKey && d.monthKey === loanKey) {
      rows.push({
        monthKey: SPACER_KEY,
        label: SPACER_LABEL,
        preSpend: 0,
        spend: 0,
        gap: 0,
        over: 0,
        total: 0,
        isPostLoan: false,
        isSpacer: true,
      });
      hasSpacer = true;
    }
    const isPostLoan = !!(loanKey && d.monthKey >= loanKey);
    if (isPostLoan && avg != null && avg > 0) {
      const spend = Math.min(d.total, avg);
      const gap = Math.max(0, avg - d.total);
      const over = Math.max(0, d.total - avg);
      rows.push({
        monthKey: d.monthKey,
        label: d.label,
        preSpend: 0,
        spend,
        gap,
        over,
        total: d.total,
        isPostLoan: true,
      });
    } else {
      rows.push({
        monthKey: d.monthKey,
        label: d.label,
        preSpend: d.total,
        spend: 0,
        gap: 0,
        over: 0,
        total: d.total,
        isPostLoan: false,
      });
    }
  }
  return { rows, hasSpacer };
}

export function LoanInterestBarChart({ data, avgMonthlyCharge, loanStartMonthKey }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No interest charges in your transaction history yet.
      </div>
    );
  }

  const { rows, hasSpacer } = buildRows(data, avgMonthlyCharge, loanStartMonthKey);

  // Recharts v3's LabelList content callback indexes only into rows where the
  // data key is non-zero, so we derive everything from `value` + the known
  // `avgMonthlyCharge` instead of looking the row up by index.
  type LabelProps = { x?: number; y?: number; width?: number; value?: number };
  const avg = avgMonthlyCharge ?? 0;

  const renderPreLoanLabel = (props: LabelProps) => {
    const { x, y, width, value } = props;
    if (x == null || y == null || width == null || !value || value <= 0) return null;
    return (
      <text x={x + width / 2} y={y - 6} fill="hsl(var(--muted-foreground))" fontSize={10} textAnchor="middle">
        ${Math.round(value)}
      </text>
    );
  };

  const renderStackTopLabel = (total: number, diff: number, props: LabelProps) => {
    const { x, y, width } = props;
    if (x == null || y == null || width == null) return null;
    const cx = x + width / 2;
    const diffColor = diff >= 0 ? COLOR_GREEN : COLOR_RED;
    const sign = diff >= 0 ? "+" : "−";
    return (
      <g>
        <text x={cx} y={y - 16} fill="hsl(var(--foreground))" fontSize={10} fontWeight={600} textAnchor="middle">
          ${Math.round(total)}
        </text>
        <text x={cx} y={y - 4} fill={diffColor} fontSize={9} fontWeight={600} textAnchor="middle">
          {sign}${Math.round(Math.abs(diff))}
        </text>
      </g>
    );
  };

  // Gap segment is topmost only when there's no overage (total <= avg).
  // value = gap = avg - total, so total = avg - value, diff = +value (savings).
  const renderGapTopLabel = (props: LabelProps) => {
    const { value } = props;
    if (value == null || value <= 0) return null;
    const total = avg - value;
    return renderStackTopLabel(total, value, props);
  };

  // Over segment is topmost when there's overage.
  // value = over = total - avg, so total = avg + value, diff = -value (loss).
  const renderOverTopLabel = (props: LabelProps) => {
    const { value } = props;
    if (value == null || value <= 0) return null;
    const total = avg + value;
    return renderStackTopLabel(total, -value, props);
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 32, right: 88, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
            width={56}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as ChartRow | undefined;
              if (!row || row.isSpacer) return null;
              const diff = (avgMonthlyCharge ?? 0) - row.total;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow text-xs">
                  <p className="font-semibold mb-1">{label}</p>
                  <p>Spend: {formatCurrency(row.total)}</p>
                  {row.isPostLoan && avgMonthlyCharge != null && (
                    <p className={diff >= 0 ? "text-green-500" : "text-red-500"}>
                      {diff >= 0 ? "Saved" : "Over"} {formatCurrency(Math.abs(diff))} vs. avg
                    </p>
                  )}
                </div>
              );
            }}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
          />
          {avgMonthlyCharge != null && avgMonthlyCharge > 0 && (
            <ReferenceLine
              y={avgMonthlyCharge}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{
                value: `Avg ${formatCurrency(avgMonthlyCharge)}`,
                position: "right",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 11,
                offset: 8,
              }}
            />
          )}
          {hasSpacer && (
            <ReferenceLine
              x={SPACER_LABEL}
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{
                value: "Loan start",
                position: "insideTopLeft",
                fill: "#a855f7",
                fontSize: 11,
                fontWeight: 600,
                offset: 8,
              }}
            />
          )}

          {/* Pre-loan months: single yellow bar */}
          <Bar
            dataKey="preSpend"
            stackId="stack"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
            isAnimationActive={false}
          >
            {rows.map((d) => (
              <Cell key={d.monthKey} fill={d.isSpacer ? "transparent" : COLOR_YELLOW} />
            ))}
            <LabelList dataKey="preSpend" position="top" content={renderPreLoanLabel} />
          </Bar>
          {/* Post-loan: yellow portion = actual spend up to avg */}
          <Bar
            dataKey="spend"
            stackId="stack"
            maxBarSize={48}
            isAnimationActive={false}
          >
            {rows.map((d) => (
              <Cell key={d.monthKey} fill={COLOR_YELLOW} />
            ))}
          </Bar>
          {/* Post-loan: green portion = unspent gap below avg */}
          <Bar
            dataKey="gap"
            stackId="stack"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
            isAnimationActive={false}
          >
            {rows.map((d) => (
              <Cell key={d.monthKey} fill={COLOR_GREEN} fillOpacity={0.45} />
            ))}
            <LabelList dataKey="gap" position="top" content={renderGapTopLabel} />
          </Bar>
          {/* Post-loan: red portion = overage above avg (topmost when present) */}
          <Bar
            dataKey="over"
            stackId="stack"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
            isAnimationActive={false}
          >
            {rows.map((d) => (
              <Cell key={d.monthKey} fill={COLOR_RED} />
            ))}
            <LabelList dataKey="over" position="top" content={renderOverTopLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
