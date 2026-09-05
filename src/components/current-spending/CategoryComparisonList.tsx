"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryComparison } from "@/lib/currentSpending";
import { fmtUSD0 } from "./format";

interface Props {
  rows: CategoryComparison[];
  noun: string;
  hasBaseline: boolean;
}

const INITIAL_ROWS = 8;

function toneFor(row: CategoryComparison) {
  if (row.delta === null || row.typical === null) {
    return { bar: "bg-indigo-400", text: "text-muted-foreground" };
  }
  const tolerance = Math.max(row.typical * 0.05, 5);
  if (Math.abs(row.delta) <= tolerance) {
    return { bar: "bg-indigo-400", text: "text-muted-foreground" };
  }
  return row.delta > 0
    ? { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" }
    : { bar: "bg-green-500", text: "text-green-600 dark:text-green-400" };
}

function deltaText(row: CategoryComparison): string {
  if (row.delta === null || row.typical === null) return "";
  const sign = row.delta >= 0 ? "+" : "−";
  const amount = `${sign}${fmtUSD0(Math.abs(row.delta))}`;
  if (row.typical < 1 && row.current > 0) return `${amount} · new`;
  if (row.pct !== null && Math.abs(row.pct) < 10) {
    return `${amount} (${sign}${Math.round(Math.abs(row.pct) * 100)}%)`;
  }
  return amount;
}

export function CategoryComparisonList({ rows, noun, hasBaseline }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No spending recorded yet this {noun}.</p>;
  }

  const visible = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const scale = Math.max(1, ...visible.map((r) => Math.max(r.current, r.typical ?? 0)));

  return (
    <div>
      {hasBaseline && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-indigo-400" />
            Spent so far
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded bg-foreground/60" />
            Typical by now
          </span>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {visible.map((row) => {
          const tone = toneFor(row);
          const currentPct = Math.min(100, (row.current / scale) * 100);
          const typicalPct =
            row.typical !== null ? Math.min(100, (row.typical / scale) * 100) : null;
          return (
            <li key={row.category} className="relative">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{row.category}</span>
                <span className="shrink-0 tabular-nums">{fmtUSD0(row.current)}</span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <div className="relative h-2 flex-1 rounded-full bg-muted/70">
                  <div
                    className={cn("absolute inset-y-0 left-0 rounded-full", tone.bar)}
                    style={{ width: `${currentPct}%` }}
                  />
                  {typicalPct !== null && (
                    <div
                      aria-hidden="true"
                      className="absolute -bottom-1 -top-1 w-0.5 rounded bg-foreground/60"
                      style={{ left: `calc(${typicalPct}% - 1px)` }}
                    />
                  )}
                </div>
                {hasBaseline && (
                  <span className={cn("w-28 shrink-0 text-right text-xs tabular-nums", tone.text)}>
                    {deltaText(row)}
                  </span>
                )}
              </div>
              {row.typical !== null && (
                <p className="sr-only">
                  Typical by now {fmtUSD0(row.typical)}
                  {row.typicalFull !== null ? `, typical full ${noun} ${fmtUSD0(row.typicalFull)}` : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > INITIAL_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden="true" /> Show fewer
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden="true" /> Show all {rows.length} categories
            </>
          )}
        </button>
      )}
    </div>
  );
}
