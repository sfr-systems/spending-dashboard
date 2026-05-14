"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import type { CategoryTotal } from "@/lib/dashboard";
import { CATEGORY_COLORS as FALLBACK_COLORS } from "./colors";

const RADIAN = Math.PI / 180;
const HOVER_EXTRA = 10;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface Props {
  data: CategoryTotal[];
  colorMap?: Record<string, string>;
  hoveredCategory?: string | null;
  onHover?: (category: string | null) => void;
}

export function CategoryPieChart({ data, colorMap, hoveredCategory, onHover }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(undefined);

  if (data.length === 0) return null;

  // Resolve the externally-hovered category to an index for cross-highlighting.
  const externalHoveredIndex =
    hoveredCategory != null ? data.findIndex((d) => d.category === hoveredCategory) : -1;

  // Internal (pie-direct) hover takes priority; fall back to external.
  const effectiveHoveredIndex =
    hoveredIndex !== undefined ? hoveredIndex : externalHoveredIndex >= 0 ? externalHoveredIndex : undefined;

  const renderShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, index } = props;
    const midAngle = props.midAngle ?? (startAngle + endAngle) / 2;
    const entry = data[index];
    if (!entry) return <></> as any;

    const fill = colorMap?.[entry.category] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    // Only pop out the sector when the mouse is directly over the pie.
    const isDirectlyHovered = index === hoveredIndex;
    const isEffectivelyHovered = index === effectiveHoveredIndex;
    const isDimmed = effectiveHoveredIndex !== undefined && !isEffectivelyHovered;
    const offset = isDirectlyHovered ? HOVER_EXTRA : 0;
    const dx = offset * Math.cos(-midAngle * RADIAN);
    const dy = offset * Math.sin(-midAngle * RADIAN);

    return (
      <Sector
        cx={cx + dx}
        cy={cy + dy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        fillOpacity={isDimmed ? 0.22 : 1}
      />
    );
  };

  const hoveredEntry = effectiveHoveredIndex !== undefined ? data[effectiveHoveredIndex] : undefined;

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius="42%"
            outerRadius="82%"
            paddingAngle={0}
            stroke="none"
            shape={renderShape}
            onMouseEnter={(_: any, index: number) => {
              setHoveredIndex(index);
              onHover?.(data[index]?.category ?? null);
            }}
            onMouseLeave={() => {
              setHoveredIndex(undefined);
              onHover?.(null);
            }}
            isAnimationActive={false}
          >
            {data.map((entry, i) => {
              const color = colorMap?.[entry.category] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
              return <Cell key={entry.category} fill={color} />;
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {hoveredEntry && (
        <div
          key={effectiveHoveredIndex}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5"
        >
          <span
            className="text-xs font-medium text-muted-foreground"
            style={{ animation: "pieValueIn 180ms ease-out forwards" }}
          >
            {hoveredEntry.category}
          </span>
          <span
            className="text-base font-semibold text-foreground tabular-nums"
            style={{ animation: "pieValueIn 180ms ease-out forwards" }}
          >
            {formatCurrency(hoveredEntry.total)}
          </span>
        </div>
      )}
    </div>
  );
}
