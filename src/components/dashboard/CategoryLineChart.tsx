"use client";

import { useRef, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { StackedPeriod } from "@/lib/dashboard";

function formatShort(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`;
}

interface Props {
  periods: StackedPeriod[];
  /** Full ordered category list (used for stable color index). */
  categories: string[];
  colorMap: Record<string, string>;
  omittedCategories: Set<string>;
  hoveredCategory: string | null;
  onCategoryHover: (cat: string | null) => void;
  isMobile: boolean;
}

export function CategoryLineChart({
  periods,
  categories,
  colorMap,
  omittedCategories,
  hoveredCategory,
  onCategoryHover,
  isMobile,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute yMax from all data so we can manually invert the y-scale.
  const yDomainMax = useMemo(() => {
    let max = 0;
    for (const period of periods) {
      for (const cat of categories) {
        const v = (period[cat] as number) ?? 0;
        if (v > max) max = v;
      }
    }
    // Match Recharts' default ~10% headroom above the data max.
    return max * 1.1;
  }, [periods, categories]);

  const handleMouseMove = useCallback(
    (data: any) => {
      if (!data || data.chartY === undefined) return;
      const payload = data.activePayload as
        | Array<{ dataKey: string; value: number }>
        | undefined;
      if (!payload?.length) return;

      // Convert cursor pixel Y to approximate data value using the chart
      // container height and known margins.
      let cursorValue: number | null = null;
      if (containerRef.current && yDomainMax > 0) {
        const svgEl = containerRef.current.querySelector("svg");
        const svgH = svgEl?.clientHeight ?? 0;
        const topMargin = 4;
        const bottomMargin = isMobile ? 4 : 32;
        const chartH = svgH - topMargin - bottomMargin;
        if (chartH > 0) {
          cursorValue = yDomainMax * (1 - data.chartY / chartH);
        }
      }

      if (cursorValue === null) return;

      let closest: string | null = null;
      let minDist = Infinity;
      for (const { dataKey, value } of payload) {
        if (!categories.includes(dataKey) || omittedCategories.has(dataKey)) continue;
        const dist = Math.abs((value ?? 0) - cursorValue);
        if (dist < minDist) {
          minDist = dist;
          closest = dataKey;
        }
      }
      if (closest) onCategoryHover(closest);
    },
    [categories, omittedCategories, onCategoryHover, yDomainMax, isMobile]
  );

  const visibleCategories = categories.filter((c) => !omittedCategories.has(c));

  if (periods.length === 0 || visibleCategories.length === 0) return null;

  return (
    <div className="h-64 sm:h-80" ref={containerRef}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={periods}
          margin={{ top: 4, right: 16, bottom: isMobile ? 4 : 32, left: 8 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => onCategoryHover(null)}
        >
          <defs>
            {visibleCategories.map((cat) => {
              const color = colorMap[cat] ?? "#64748b";
              const id = `slcg-${cat.replace(/[^a-zA-Z0-9]/g, "_")}`;
              return (
                <linearGradient key={cat} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.38} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>

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
            height={isMobile ? 8 : 48}
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

          {visibleCategories.map((cat) => {
            const color = colorMap[cat] ?? "#64748b";
            const isHovered = hoveredCategory === cat;
            const isDimmed = hoveredCategory !== null && !isHovered;
            const gradId = `slcg-${cat.replace(/[^a-zA-Z0-9]/g, "_")}`;

            // eslint-disable-next-line react/display-name
            const makeDotRenderer = (catKey: string, dotColor: string) =>
              (dotProps: any) => {
                const { cx, cy, index, payload } = dotProps;
                if (typeof cx !== "number" || typeof cy !== "number") return null;
                // Show dot at every period — including $0 — so all X positions
                // are marked when a category is hovered.
                const value = (payload?.[catKey] as number) ?? 0;
                const showLabel = value > 0;
                return (
                  <g key={`dot-${catKey}-${index}`}>
                    <circle cx={cx} cy={cy} r={2.5} fill={dotColor} />
                    {showLabel && (
                      <text
                        x={cx}
                        y={cy - 9}
                        textAnchor="middle"
                        fontSize={9}
                        fill={dotColor}
                        fontWeight={600}
                        style={{ pointerEvents: "none", userSelect: "none" } as React.CSSProperties}
                      >
                        {formatShort(value)}
                      </text>
                    )}
                  </g>
                );
              };

            return (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeOpacity={isDimmed ? 0.18 : 1}
                // Keep a tiny non-zero fill so the path participates in pointer
                // events, enabling onMouseEnter to fire when hovering over the line.
                fill={`url(#${gradId})`}
                fillOpacity={isHovered ? 1 : 0.06}
                dot={isHovered ? (makeDotRenderer(cat, color) as any) : false}
                activeDot={false}
                isAnimationActive={false}
                onMouseEnter={() => onCategoryHover(cat)}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
