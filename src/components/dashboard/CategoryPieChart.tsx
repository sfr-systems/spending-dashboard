"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";
import type { CategoryTotal } from "@/lib/dashboard";
import { CATEGORY_COLORS as FALLBACK_COLORS } from "./colors";

const RADIAN = Math.PI / 180;
const BASE_OFFSET = 8;
const HOVER_EXTRA = 8;

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
}

export function CategoryPieChart({ data, colorMap }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(undefined);

  if (data.length === 0) return null;

  const allIndices = data.map((_, i) => i);

  const renderShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, index } = props;
    const midAngle = props.midAngle ?? (startAngle + endAngle) / 2;
    const entry = data[index];
    if (!entry) return null;

    const fill = colorMap?.[entry.category] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    const isHovered = index === hoveredIndex;
    const isDimmed = hoveredIndex !== undefined && !isHovered;
    const offset = BASE_OFFSET + (isHovered ? HOVER_EXTRA : 0);
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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius="30%"
          outerRadius="65%"
          paddingAngle={0}
          stroke="none"
          activeIndex={allIndices}
          activeShape={renderShape}
          onMouseEnter={(_: any, index: number) => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(undefined)}
          isAnimationActive={false}
        >
          {data.map((entry, i) => {
            const color = colorMap?.[entry.category] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
            return <Cell key={entry.category} fill={color} />;
          })}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0] as any;
            const name = item.name ?? item.payload?.category ?? "";
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow text-xs">
                <p className="font-semibold mb-1">{name}</p>
                <p>{formatCurrency(Number(item.value))}</p>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
