"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${+m}/${+d}/${y.slice(2)}`;
}

export function PeriodSelector() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("period") ?? "all";

  const [customOpen, setCustomOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) setCustomOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openCustom() {
    setFromDate(params.get("from") ?? "");
    setToDate(params.get("to") ?? "");
    setCustomOpen((o) => !o);
  }

  function savePref(pref: Record<string, string>) {
    fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dashboardPeriod: pref }),
    }).catch(() => {});
  }

  function select(value: string) {
    savePref(value === "custom" ? {} : { period: value });
    const next = new URLSearchParams(params.toString());
    next.delete("from");
    next.delete("to");
    next.set("period", value);
    setCustomOpen(false);
    router.push(`/dashboard?${next.toString()}`);
  }

  function applyCustom() {
    if (!fromDate || !toDate || fromDate > toDate) return;
    savePref({ period: "custom", from: fromDate, to: toDate });
    const next = new URLSearchParams(params.toString());
    next.set("period", "custom");
    next.set("from", fromDate);
    next.set("to", toDate);
    setCustomOpen(false);
    router.push(`/dashboard?${next.toString()}`);
  }

  const isCustom = current === "custom";
  const fromParam = params.get("from") ?? "";
  const toParam = params.get("to") ?? "";
  const customLabel =
    isCustom && fromParam && toParam
      ? `${fmtDate(fromParam)} – ${fmtDate(toParam)}`
      : "Custom";

  const canApply = !!fromDate && !!toDate && fromDate <= toDate;

  return (
    <div className="relative">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => select(p.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              current === p.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          ref={btnRef}
          onClick={openCustom}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            isCustom
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {customLabel}
        </button>
      </div>

      {customOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 min-w-max rounded-xl border border-border bg-card p-4 shadow-xl"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Custom range
          </p>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground [color-scheme:dark]"
              />
            </div>
            <span className="mb-2 text-muted-foreground">→</span>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground [color-scheme:dark]"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!canApply}
              className="mb-0.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
