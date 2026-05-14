"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";

const TOP4_COLORS = ["#6366f1", "#ec4899", "#f97316", "#14b8a6"];
const OTHER_COLOR = "#94a3b8";

const RADIAN = Math.PI / 180;
const HOVER_OFFSET = 10;

interface DataPoint {
  name: string;
  value: number;
  isOther?: boolean;
}

interface Props {
  data: DataPoint[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MiniCategoryPieChart({ data }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(undefined);

  if (data.length === 0) return null;

  const getColor = (i: number, entry: DataPoint) =>
    entry.isOther ? OTHER_COLOR : TOP4_COLORS[i % TOP4_COLORS.length];

  const renderShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, index } = props;
    const midAngle = props.midAngle ?? (startAngle + endAngle) / 2;
    const entry = data[index];
    if (!entry) return <></> as any;
    const fill = getColor(index, entry);
    const isHovered = index === hoveredIndex;
    const isDimmed = hoveredIndex !== undefined && !isHovered;
    const dx = isHovered ? HOVER_OFFSET * Math.cos(-midAngle * RADIAN) : 0;
    const dy = isHovered ? HOVER_OFFSET * Math.sin(-midAngle * RADIAN) : 0;
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

  const hoveredEntry = hoveredIndex !== undefined ? data[hoveredIndex] : undefined;

  return (
    <div className="flex flex-col items-center h-full w-full gap-2">
      {/* Pie chart with centered hover amount */}
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="90%"
              paddingAngle={0}
              stroke="none"
              shape={renderShape}
              onMouseEnter={(_: any, index: number) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(undefined)}
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={getColor(i, entry)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {hoveredEntry && (
          <div
            key={hoveredIndex}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              className="text-sm font-semibold text-foreground tabular-nums"
              style={{ animation: "pieValueIn 180ms ease-out forwards" }}
            >
              {formatCurrency(hoveredEntry.value)}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 shrink-0">
        {data.map((entry, i) => {
          const isDimmed = hoveredIndex !== undefined && i !== hoveredIndex;
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={entry.name}
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity duration-100 ${
                isDimmed ? "opacity-30" : "opacity-100"
              }`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(undefined)}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: getColor(i, entry) }}
              />
              <span
                className={`text-xs transition-colors duration-100 ${
                  isHovered ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {entry.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
