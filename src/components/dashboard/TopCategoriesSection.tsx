"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
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
  const [contextMenu, setContextMenu] = useState<
    { x: number; y: number; category: string } | null
  >(null);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setContextMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    const onScroll = () => setContextMenu(null);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [contextMenu]);

  const handleChartContextMenu = (e: React.MouseEvent) => {
    if (!hoveredCategory) return;
    e.preventDefault();
    const menuWidth = 200;
    const menuHeight = 44;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x, y, category: hoveredCategory });
  };

  const analyzeFurther = () => {
    if (!contextMenu) return;
    window.dispatchEvent(
      new CustomEvent("spendwise:select-category", { detail: contextMenu.category }),
    );
    setContextMenu(null);
  };

  const categories = data.filter((d) => d.total > 0);

  // Stable color map keyed by category name.
  const colorMap = useMemo(
    () =>
      Object.fromEntries(
        categories.map((d, i) => [d.category, CATEGORY_COLORS[i % CATEGORY_COLORS.length]])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories.map((d) => d.category).join(",")]
  );

  const legendItems = categories.map((d) => ({
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
  const visibleData = categories.filter((d) => !omittedCategories.has(d.category));

  const renderContextMenu = () => {
    if (!mounted || !contextMenu) return null;
    return createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label="Category options"
        className="fixed z-[9999] w-max min-w-[200px] h-auto rounded-md border border-border bg-popover py-1 shadow-lg"
        style={{ top: contextMenu.y, left: contextMenu.x }}
      >
        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {contextMenu.category}
        </div>
        <button
          role="menuitem"
          onClick={analyzeFurther}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          Analyze further
        </button>
      </div>,
      document.body,
    );
  };

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
      <div className="flex gap-4 mt-1 items-center" onMouseLeave={() => setHoveredCategory(null)}>
        <div
          className="flex-[2] min-w-0 h-[21rem] sm:h-[26rem] [&_*]:outline-none"
          onContextMenu={handleChartContextMenu}
        >
          <CategoryChart
            data={visibleData}
            colorMap={colorMap}
            hoveredCategory={hoveredCategory}
            onHover={setHoveredCategory}
          />
        </div>

        <div
          className="flex-1 min-w-0 h-[21rem] sm:h-[26rem] [&_*]:outline-none"
          onContextMenu={handleChartContextMenu}
        >
          <CategoryPieChart
            data={visibleData}
            colorMap={colorMap}
            hoveredCategory={hoveredCategory}
            onHover={setHoveredCategory}
          />
        </div>

        {/* Legend on the far right */}
        <div className="shrink-0 w-36">
          <CategoryLegend
            items={legendItems}
            hoveredCategory={hoveredCategory}
            onHover={setHoveredCategory}
            omittedCategories={omittedCategories}
            onToggle={toggleCategory}
            align="right"
          />
        </div>
        {renderContextMenu()}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-1" onMouseLeave={() => setHoveredCategory(null)}>
      <div
        className="h-[18rem] sm:h-[21rem] [&_*]:outline-none"
        onContextMenu={handleChartContextMenu}
      >
        <CategoryChart
          data={visibleData}
          colorMap={colorMap}
          hoveredCategory={hoveredCategory}
          onHover={setHoveredCategory}
        />
      </div>
      <div
        className="h-[18rem] sm:h-[21rem] [&_*]:outline-none"
        onContextMenu={handleChartContextMenu}
      >
        <CategoryPieChart
          data={visibleData}
          colorMap={colorMap}
          hoveredCategory={hoveredCategory}
          onHover={setHoveredCategory}
        />
      </div>
      {portraitLegend}
      {renderContextMenu()}
    </div>
  );
}
