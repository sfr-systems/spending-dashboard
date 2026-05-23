"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CategoryTotal } from "@/lib/dashboard";
import { CATEGORY_COLORS as FALLBACK_COLORS } from "./colors";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface Props {
  data: CategoryTotal[];
  /** Category-name → hex color. When provided, colors are stable even when
   *  categories are filtered out. Falls back to index-based palette otherwise. */
  colorMap?: Record<string, string>;
  hoveredCategory?: string | null;
  onHover?: (category: string | null) => void;
}

export function CategoryChart({ data, colorMap, hoveredCategory, onHover }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No spending data yet.
      </div>
    );
  }

  // Reverse for display so the highest-spend bar is at the top.
  const display = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={display}
        layout="vertical"
        margin={{ top: 4, right: 80, bottom: 4, left: 8 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v) =>
            v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`
          }
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={150}
          tick={{ fontSize: 12 }}
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
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Bar
          dataKey="total"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
          isAnimationActive={false}
          onMouseEnter={(barData: any) => onHover?.(barData.category)}
          onMouseLeave={() => onHover?.(null)}
        >
          {display.map((entry) => {
            const color =
              colorMap?.[entry.category] ??
              FALLBACK_COLORS[data.indexOf(entry) % FALLBACK_COLORS.length];
            const isHovered = hoveredCategory === entry.category;
            const isDimmed = hoveredCategory != null && !isHovered;
            return (
              <Cell
                key={entry.category}
                fill={color}
                fillOpacity={isDimmed ? 0.22 : 1}
                style={{ transition: "fill-opacity 100ms" }}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
