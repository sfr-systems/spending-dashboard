"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CategoryLegend } from "./CategoryLegend";
import { CategoryLineChart } from "./CategoryLineChart";
import { CATEGORY_COLORS } from "./colors";
import type { StackedSpendingData } from "@/lib/dashboard";
const INCOME_COLOR = "#22c55e";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

interface Props {
  monthlyData: StackedSpendingData;
  weeklyData: StackedSpendingData;
  includeIncome: boolean;
}

export function StackedSpendingChart({ monthlyData, weeklyData, includeIncome }: Props) {
  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [omittedCategories, setOmittedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { periods, categories } = view === "monthly" ? monthlyData : weeklyData;

  // Stable color map keyed by category name so colors stay consistent when
  // categories are toggled on/off.
  const colorMap = useMemo(
    () =>
      Object.fromEntries(
        categories.map((cat, i) => [cat, CATEGORY_COLORS[i % CATEGORY_COLORS.length]])
      ),
    [categories]
  );

  const toggleCategory = (cat: string) => {
    setOmittedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
    if (hoveredCategory === cat) setHoveredCategory(null);
  };

  const legendItems = [
    ...categories.map((cat) => ({ label: cat, color: colorMap[cat] })),
    ...(includeIncome ? [{ label: "Income", color: INCOME_COLOR }] : []),
  ];

  // Only render bars / lines for non-omitted categories.
  const visibleCategories = categories.filter((c) => !omittedCategories.has(c));

  if (periods.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No spending data for this period.
      </div>
    );
  }

  const portraitLegend = (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {legendItems.map(({ label, color }) => {
        const isOmitted = omittedCategories.has(label);
        const isHovered = hoveredCategory === label;
        const isDimmed = !isOmitted && hoveredCategory !== null && !isHovered;
        return (
          <button
            key={label}
            onClick={() => toggleCategory(label)}
            onMouseEnter={() => { if (!isOmitted) setHoveredCategory(label); }}
            onMouseLeave={() => setHoveredCategory(null)}
            className={`flex items-center gap-1.5 cursor-pointer select-none transition-opacity duration-100 ${
              isOmitted ? "opacity-40" : isDimmed ? "opacity-30" : "opacity-100"
            }`}
          >
            {isOmitted ? (
              <span
                className="h-2.5 w-2.5 rounded-full border-2 shrink-0"
                style={{ borderColor: color }}
              />
            ) : (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
            )}
            <span
              className={`text-xs ${
                isHovered && !isOmitted ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col mt-1">
      {/* Monthly / Weekly toggle */}
      <div className="mb-3 flex items-center gap-2">
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

      {/* Legend sidebar (landscape) + stacked chart column */}
      <div className="flex gap-4 items-center">
        {isLandscape && (
          <div className="shrink-0 w-36">
            <CategoryLegend
              items={legendItems}
              hoveredCategory={hoveredCategory}
              onHover={setHoveredCategory}
              omittedCategories={omittedCategories}
              onToggle={toggleCategory}
            />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Stacked bar chart */}
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={periods}
                margin={{ top: 4, right: 16, bottom: isMobile ? 4 : 48, left: 8 }}
                barCategoryGap="22%"
                barGap={4}
              >
                <XAxis
                  dataKey="period"
                  tick={
                    isMobile
                      ? false
                      : { fontSize: 10, angle: -90, textAnchor: "end", dy: -4, dx: -4 }
                  }
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  height={isMobile ? 8 : 56}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`
                  }
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow text-xs">
                        <p className="font-semibold mb-1">{label}</p>
                        {[...payload].reverse().map((p: any) => (
                          <div key={p.dataKey} className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
                            <span>{p.dataKey}: {formatCurrency(Number(p.value))}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                />
                {visibleCategories.map((cat, idx) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="spending"
                    fill={colorMap[cat]}
                    fillOpacity={hoveredCategory && hoveredCategory !== cat ? 0.2 : 1}
                    maxBarSize={56}
                    radius={
                      idx === visibleCategories.length - 1
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                    isAnimationActive={false}
                  />
                ))}
                {includeIncome && !omittedCategories.has("Income") && (
                  <Bar
                    dataKey="Income"
                    stackId="income"
                    fill={INCOME_COLOR}
                    maxBarSize={56}
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.85}
                    isAnimationActive={false}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Divider between bar chart and line chart */}
          <div className="flex items-center gap-2 px-1">
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
              per-category trend
            </span>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          {/* Multi-line trend chart */}
          <CategoryLineChart
            periods={periods}
            categories={categories}
            colorMap={colorMap}
            omittedCategories={omittedCategories}
            hoveredCategory={hoveredCategory}
            onCategoryHover={setHoveredCategory}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Portrait-only legend (interactive) */}
      {!isLandscape && portraitLegend}
    </div>
  );
}
