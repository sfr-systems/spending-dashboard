"use client";

import { useState, useEffect, useMemo } from "react";
import { CategoryChart } from "./CategoryChart";
import { CategoryPieChart } from "./CategoryPieChart";
import { CategoryLegend } from "./CategoryLegend";
import { CATEGORY_COLORS } from "./colors";
import type { CategoryTotal } from "@/lib/dashboard";

interface Props {
  data: CategoryTotal[];
}

export function TopCategoriesSection({ data }: Props) {
  const [isLandscape, setIsLandscape] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [omittedCategories, setOmittedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const top10 = data.slice(0, 10);

  // Stable color map keyed by category name.
  const colorMap = useMemo(
    () =>
      Object.fromEntries(
        top10.map((d, i) => [d.category, CATEGORY_COLORS[i % CATEGORY_COLORS.length]])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top10.map((d) => d.category).join(",")]
  );

  const legendItems = top10.map((d) => ({
    label: d.category,
    color: colorMap[d.category],
  }));

  const toggleCategory = (cat: string) => {
    setOmittedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
    if (hoveredCategory === cat) setHoveredCategory(null);
  };

  // Pass only visible categories to the charts.
  const visibleData = top10.filter((d) => !omittedCategories.has(d.category));

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
              <span className="h-2.5 w-2.5 rounded-full border-2 shrink-0" style={{ borderColor: color }} />
            ) : (
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            )}
            <span className={`text-xs ${isHovered && !isOmitted ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (isLandscape) {
    return (
      <div className="flex gap-4 mt-1 items-center">
        {/* Shared legend for both bar and pie */}
        <div className="shrink-0 w-36">
          <CategoryLegend
            items={legendItems}
            hoveredCategory={hoveredCategory}
            onHover={setHoveredCategory}
            omittedCategories={omittedCategories}
            onToggle={toggleCategory}
          />
        </div>

        <div className="flex-[2] min-w-0 h-64 sm:h-80">
          <CategoryChart data={visibleData} colorMap={colorMap} />
        </div>

        <div className="flex-1 min-w-0 h-64 sm:h-80">
          <CategoryPieChart data={visibleData} colorMap={colorMap} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-1">
      <div className="h-56 sm:h-64">
        <CategoryChart data={visibleData} colorMap={colorMap} />
      </div>
      <div className="h-56 sm:h-64">
        <CategoryPieChart data={visibleData} colorMap={colorMap} />
      </div>
      {portraitLegend}
    </div>
  );
}
