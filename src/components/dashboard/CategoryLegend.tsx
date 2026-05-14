"use client";

interface LegendItem {
  label: string;
  color: string;
}

interface Props {
  items: LegendItem[];
  className?: string;
  hoveredCategory?: string | null;
  onHover?: (label: string | null) => void;
  omittedCategories?: Set<string>;
  onToggle?: (label: string) => void;
  /** When "right", labels are right-aligned and the dot appears after the label. */
  align?: "left" | "right";
}

export function CategoryLegend({
  items,
  className,
  hoveredCategory,
  onHover,
  omittedCategories,
  onToggle,
  align = "left",
}: Props) {
  const isInteractive = !!(onHover || onToggle);

  return (
    <div className={`flex flex-col gap-1.5 py-1 ${className ?? ""}`}>
      {items.map(({ label, color }) => {
        const isOmitted = omittedCategories?.has(label) ?? false;
        const isHovered = hoveredCategory === label;
        const isDimmed = !isOmitted && hoveredCategory != null && !isHovered;

        const dot = (
          <span className="shrink-0 flex items-center justify-center w-2.5 h-2.5">
            {isOmitted ? (
              <span
                className="w-2.5 h-2.5 rounded-full border-2"
                style={{ borderColor: color }}
              />
            ) : (
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
          </span>
        );

        const labelEl = (
          <span
            className={`truncate text-xs transition-colors duration-100 ${
              align === "right" ? "flex-1 text-right" : ""
            } ${
              isHovered && !isOmitted
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
        );

        return (
          <div
            key={label}
            className={`flex items-center gap-2 min-w-0 transition-opacity duration-100 ${
              align === "right" ? "flex-row-reverse" : ""
            } ${isInteractive ? "cursor-pointer select-none" : ""} ${
              isOmitted ? "opacity-40" : isDimmed ? "opacity-30" : "opacity-100"
            }`}
            onClick={onToggle ? () => onToggle(label) : undefined}
            onMouseEnter={onHover && !isOmitted ? () => onHover(label) : undefined}
            onMouseLeave={onHover ? () => onHover(null) : undefined}
          >
            {dot}
            {labelEl}
          </div>
        );
      })}
    </div>
  );
}
