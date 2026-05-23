"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CATEGORY_COLORS } from "./colors";
import { toMonthKey, getISOWeekKey } from "@/lib/dashboard";

export interface CategoryTransaction {
  date: string; // ISO string
  amount: number; // negative for spending
  source: string;
  category: string;
}

interface Props {
  transactions: CategoryTransaction[];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatCurrencyFull(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthLabelFromKey(key: string): string {
  const [year, month] = key.split("-");
  return `${+month}/${year.slice(2)}`;
}

function weekLabelFromKey(key: string): string {
  // "2024-W13" -> Monday of that ISO week
  const [yr, wk] = key.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(yr, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (day - 1) * 86400000);
  const monday = new Date(week1Monday.getTime() + (wk - 1) * 7 * 86400000);
  return `${monday.getUTCMonth() + 1}/${monday.getUTCDate()}`;
}

function fillMonthGaps(sortedKeys: string[]): string[] {
  if (sortedKeys.length === 0) return [];
  if (sortedKeys.length === 1) return sortedKeys;
  const [startY, startM] = sortedKeys[0].split("-").map(Number);
  const [endY, endM] = sortedKeys[sortedKeys.length - 1].split("-").map(Number);
  const out: string[] = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function fillWeekGaps(sortedKeys: string[]): string[] {
  if (sortedKeys.length === 0) return [];
  if (sortedKeys.length === 1) return sortedKeys;
  const toMonday = (key: string) => {
    const [yr, wk] = key.split("-W").map(Number);
    const jan4 = new Date(Date.UTC(yr, 0, 4));
    const day = jan4.getUTCDay() || 7;
    const week1Monday = new Date(jan4.getTime() - (day - 1) * 86400000);
    return new Date(week1Monday.getTime() + (wk - 1) * 7 * 86400000);
  };
  const out: string[] = [];
  let d = toMonday(sortedKeys[0]);
  const end = toMonday(sortedKeys[sortedKeys.length - 1]);
  while (d <= end) {
    out.push(getISOWeekKey(d));
    d = new Date(d.getTime() + 7 * 86400000);
  }
  return out;
}

export function CategoryAnalysisSection({ transactions }: Props) {
  // Aggregate totals by category to determine the default selection and the
  // category chooser ordering.
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.amount >= 0) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const defaultCategory = categoryTotals[0]?.category ?? null;
  const [selected, setSelected] = useState<string | null>(defaultCategory);
  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // External callers (e.g. the Top Categories context menu) dispatch this
  // event to jump here and focus a specific category.
  useEffect(() => {
    const onSelect = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;
      setSelected(detail);
      const target = document.getElementById("category-analysis");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("spendwise:select-category", onSelect);
    return () => window.removeEventListener("spendwise:select-category", onSelect);
  }, []);

  // Reset selection when the underlying data changes such that the selected
  // category no longer exists in it.
  const selectedCategory =
    selected && categoryTotals.some((c) => c.category === selected)
      ? selected
      : defaultCategory;

  const categoryTxns = useMemo(
    () =>
      transactions.filter(
        (t) => t.amount < 0 && t.category === selectedCategory,
      ),
    [transactions, selectedCategory],
  );

  const chartData = useMemo(() => {
    if (!selectedCategory) return [] as Array<{ period: string; total: number }>;
    const map = new Map<string, number>();
    for (const t of categoryTxns) {
      const d = new Date(t.date);
      const key = view === "monthly" ? toMonthKey(d) : getISOWeekKey(d);
      map.set(key, (map.get(key) ?? 0) + Math.abs(t.amount));
    }
    const sorted = Array.from(map.keys()).sort();
    const allKeys = view === "monthly" ? fillMonthGaps(sorted) : fillWeekGaps(sorted);
    const labeler = view === "monthly" ? monthLabelFromKey : weekLabelFromKey;
    return allKeys.map((key) => ({
      period: labeler(key),
      total: map.get(key) ?? 0,
    }));
  }, [categoryTxns, view, selectedCategory]);

  const sourceRows = useMemo(() => {
    const map = new Map<string, { total: number; txns: CategoryTransaction[] }>();
    for (const t of categoryTxns) {
      const entry = map.get(t.source) ?? { total: 0, txns: [] };
      entry.total += Math.abs(t.amount);
      entry.txns.push(t);
      map.set(t.source, entry);
    }
    return Array.from(map.entries())
      .map(([source, { total, txns }]) => ({
        source,
        total,
        count: txns.length,
        txns: [...txns].sort((a, b) => (a.date < b.date ? 1 : -1)),
      }))
      .sort((a, b) => b.total - a.total);
  }, [categoryTxns]);

  const selectedColor = (() => {
    const idx = categoryTotals.findIndex((c) => c.category === selectedCategory);
    return CATEGORY_COLORS[(idx >= 0 ? idx : 0) % CATEGORY_COLORS.length];
  })();

  const toggleSource = (source: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  if (categoryTotals.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No spending data for this period.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header: title + monthly/weekly toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="bg-gradient-to-r from-indigo-300 via-violet-300 to-pink-300 bg-clip-text text-base font-semibold uppercase tracking-wide text-transparent">
          Category analysis
        </h2>
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
          {(["monthly", "weekly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                view === v
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "monthly" ? "Monthly" : "Weekly"}
            </button>
          ))}
        </div>
      </div>

      {/* Category chooser pills */}
      <div className="flex flex-wrap gap-2">
        {categoryTotals.map(({ category, total }, i) => {
          const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
          const isSelected = category === selectedCategory;
          return (
            <button
              key={category}
              onClick={() => setSelected(category)}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-foreground/20 bg-muted text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              }`}
              aria-pressed={isSelected}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              {category}
              <span className="text-muted-foreground/70">
                {formatCurrency(total)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-80 w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No spending in this category for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 16, bottom: 4, left: 8 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.6}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, angle: -90, textAnchor: "end", dy: -4, dx: -4 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval={0}
                height={56}
              />
              <YAxis
                tickFormatter={(v) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`
                }
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={52}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow text-xs">
                      <p className="font-semibold mb-1">{label}</p>
                      <p>{formatCurrencyFull(Number(payload[0]?.value))}</p>
                    </div>
                  );
                }}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              />
              <Bar
                dataKey="total"
                radius={[4, 4, 0, 0]}
                maxBarSize={68}
                isAnimationActive={false}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={selectedColor} />
                ))}
                {chartData.length < 50 && (
                  <LabelList
                    dataKey="total"
                    position="top"
                    offset={6}
                    fontSize={10}
                    fill="hsl(var(--muted-foreground))"
                    formatter={(value) => {
                      const v = Number(value);
                      if (!Number.isFinite(v)) return "";
                      return v >= 10000
                        ? `$${(v / 1000).toFixed(0)}k`
                        : v >= 1000
                        ? `$${(v / 1000).toFixed(1)}k`
                        : `$${Math.round(v)}`;
                    }}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Source breakdown table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-8" />
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-right font-medium">Transactions</th>
              <th className="px-3 py-2 text-right font-medium">Total spent</th>
            </tr>
          </thead>
          <tbody>
            {sourceRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  No transactions for this category.
                </td>
              </tr>
            ) : (
              sourceRows.map((row) => {
                const isOpen = expanded.has(row.source);
                return (
                  <FragmentRow
                    key={row.source}
                    row={row}
                    isOpen={isOpen}
                    onToggle={() => toggleSource(row.source)}
                    detailColor={selectedColor}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  isOpen,
  onToggle,
  detailColor,
}: {
  row: {
    source: string;
    total: number;
    count: number;
    txns: CategoryTransaction[];
  };
  isOpen: boolean;
  onToggle: () => void;
  detailColor: string;
}) {
  return (
    <>
      <tr
        className="border-t border-border hover:bg-muted/30 cursor-pointer"
        onClick={onToggle}
      >
        <td className="pl-3 pr-1 py-2 align-middle">
          <button
            type="button"
            aria-label={isOpen ? "Collapse source" : "Expand source"}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-3 py-2 font-medium text-foreground">{row.source}</td>
        <td className="px-3 py-2 text-right text-muted-foreground">
          {row.count}
        </td>
        <td className="px-3 py-2 text-right font-medium text-foreground">
          {formatCurrencyFull(row.total)}
        </td>
      </tr>
      {isOpen && (
        <tr className="border-t border-border bg-muted/60">
          <td colSpan={4} className="p-0">
            <ul>
              {row.txns.map((t, i) => (
                <li
                  key={i}
                  style={{ color: detailColor }}
                  className="flex items-center justify-between gap-3 px-3 py-0.5 text-xs even:bg-white/[0.04] hover:bg-black/30 transition-colors"
                >
                  <span>{formatDate(t.date)}</span>
                  <span className="font-mono">
                    {formatCurrencyFull(Math.abs(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
