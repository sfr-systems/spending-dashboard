"use client";

interface DonutItem {
  name: string;
  value: number;
  color: string;
}

interface Props {
  items: DonutItem[];
  total: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const R = 42;
const CIRC = 2 * Math.PI * R;

const CELL_POSITIONS = [
  "col-start-1 col-span-2 row-start-1",
  "col-start-3 col-span-2 row-start-1",
  "col-start-5 col-span-2 row-start-1",
  "col-start-2 col-span-2 row-start-2",
  "col-start-4 col-span-2 row-start-2",
  "col-start-6 col-span-2 row-start-2",
];

export function CategoryShareDonuts({ items, total }: Props) {
  if (items.length === 0 || total <= 0) return null;

  const top = items.slice(0, 6);

  return (
    <div className="grid grid-cols-7 grid-rows-2 gap-x-0 gap-y-2 h-full w-full">
      {top.map((item, i) => {
        const pct = (item.value / total) * 100;
        const dash = (pct / 100) * CIRC;
        return (
          <div
            key={item.name}
            className={`flex flex-col items-center min-h-0 min-w-0 ${CELL_POSITIONS[i]}`}
          >
            <div
              className="text-[10px] sm:text-xs font-medium truncate max-w-full leading-tight mb-1"
              style={{ color: item.color }}
              title={item.name}
            >
              {item.name}
            </div>
            <div className="relative flex-1 min-h-0 w-full">
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full -rotate-90"
              >
                <circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="12"
                  strokeDasharray={`${dash} ${CIRC}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xs sm:text-sm font-semibold text-foreground tabular-nums leading-tight">
                  {pct.toFixed(0)}%
                </div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground tabular-nums leading-tight">
                  {formatCurrency(item.value)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
