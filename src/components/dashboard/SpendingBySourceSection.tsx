"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  useXAxisScale,
  useYAxisScale,
} from "recharts";
import { Search, X, Check, List, Pencil, ChevronDown } from "lucide-react";
import { CATEGORY_COLORS } from "./colors";
import { getISOWeekKey } from "@/lib/dashboard";

export interface SourceTransaction {
  date: string; // ISO string
  amount: number;
  source: string;
}

interface Props {
  allSources: string[];
  transactions: SourceTransaction[];
  cleanedData: boolean;
  periodBoundStart?: string;
  periodBoundEnd?: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function fillMonthGaps(keys: string[], boundStart?: string, boundEnd?: string): string[] {
  const effective = new Set(keys);
  if (boundStart) effective.add(boundStart);
  if (boundEnd) effective.add(boundEnd);
  if (effective.size === 0) return [];
  const sorted = Array.from(effective).sort();
  if (sorted.length === 1) return sorted;
  const [startY, startM] = sorted[0].split("-").map(Number);
  const [endY, endM] = sorted[sorted.length - 1].split("-").map(Number);
  const result: string[] = [];
  let y = startY, m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) { m = 1; y++; }
  }
  return result;
}

function getWeekStart(weekKey: string): Date {
  const [yr, wk] = weekKey.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(yr, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (day - 1) * 86400000);
  return new Date(week1Monday.getTime() + (wk - 1) * 7 * 86400000);
}

function fillWeekGaps(keys: string[], boundStart?: string, boundEnd?: string): string[] {
  const effective = new Set(keys);
  if (boundStart) effective.add(boundStart);
  if (boundEnd) effective.add(boundEnd);
  if (effective.size === 0) return [];
  const sorted = Array.from(effective).sort();
  if (sorted.length === 1) return sorted;
  const result: string[] = [];
  let d = getWeekStart(sorted[0]);
  const end = getWeekStart(sorted[sorted.length - 1]);
  while (d <= end) {
    result.push(getISOWeekKey(d));
    d = new Date(d.getTime() + 7 * 86400000);
  }
  return result;
}

type ViewMode = "monthly" | "weekly";

function periodKeyFn(view: ViewMode) {
  return view === "monthly"
    ? (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    : getISOWeekKey;
}

function periodLabelFn(view: ViewMode) {
  return view === "monthly"
    ? (key: string) => { const [y, m] = key.split("-"); return `${+m}/${y.slice(2)}`; }
    : (key: string) => { const [yr, wk] = key.split("-W"); return `W${+wk}/${yr.slice(2)}`; };
}

function fillPeriodGaps(view: ViewMode, keys: string[], boundStart?: string, boundEnd?: string) {
  return view === "monthly"
    ? fillMonthGaps(keys, boundStart, boundEnd)
    : fillWeekGaps(keys, boundStart, boundEnd);
}

function computeSourceData(
  transactions: SourceTransaction[],
  selectedSources: string[],
  view: ViewMode,
  boundStart?: string,
  boundEnd?: string
): { rows: Array<Record<string, string | number>>; totals: Record<string, number> } {
  const periodMap = new Map<string, Map<string, number>>();
  const toKey = periodKeyFn(view);
  const toLabel = periodLabelFn(view);

  for (const t of transactions) {
    if (t.amount >= 0) continue;
    if (!selectedSources.includes(t.source)) continue;
    const key = toKey(new Date(t.date));
    if (!periodMap.has(key)) periodMap.set(key, new Map());
    const sourceMap = periodMap.get(key)!;
    sourceMap.set(t.source, (sourceMap.get(t.source) ?? 0) + Math.abs(t.amount));
  }

  const sortedKeys = fillPeriodGaps(view, Array.from(periodMap.keys()), boundStart, boundEnd);
  const totals: Record<string, number> = Object.fromEntries(selectedSources.map((s) => [s, 0]));

  const rows = sortedKeys.map((key) => {
    const row: Record<string, string | number> = { month: toLabel(key) };
    for (const source of selectedSources) {
      const amount = periodMap.get(key)?.get(source) ?? 0;
      row[source] = amount;
      totals[source] += amount;
    }
    return row;
  });

  return { rows, totals };
}

function computeSourceCountData(
  transactions: SourceTransaction[],
  selectedSources: string[],
  view: ViewMode,
  boundStart?: string,
  boundEnd?: string
): { rows: Array<Record<string, string | number>>; totals: Record<string, number> } {
  const periodMap = new Map<string, Map<string, number>>();
  const toKey = periodKeyFn(view);
  const toLabel = periodLabelFn(view);

  for (const t of transactions) {
    if (t.amount >= 0) continue;
    if (!selectedSources.includes(t.source)) continue;
    const key = toKey(new Date(t.date));
    if (!periodMap.has(key)) periodMap.set(key, new Map());
    const sourceMap = periodMap.get(key)!;
    sourceMap.set(t.source, (sourceMap.get(t.source) ?? 0) + 1);
  }

  const sortedKeys = fillPeriodGaps(view, Array.from(periodMap.keys()), boundStart, boundEnd);
  const totals: Record<string, number> = Object.fromEntries(selectedSources.map((s) => [s, 0]));

  const rows = sortedKeys.map((key) => {
    const row: Record<string, string | number> = { month: toLabel(key) };
    for (const source of selectedSources) {
      const count = periodMap.get(key)?.get(source) ?? 0;
      row[source] = count;
      totals[source] += count;
    }
    return row;
  });

  return { rows, totals };
}

type ChartMode = "grouped" | "stacked";

function GroupedBarsIcon({ active }: { active: boolean }) {
  return (
    <svg width="45" height="27" viewBox="0 0 30 18" aria-hidden className={active ? "opacity-100" : "opacity-35"}>
      <rect x="1"  y="7"  width="4" height="10" rx="1" fill="#3b82f6" />
      <rect x="6"  y="3"  width="4" height="14" rx="1" fill="#ec4899" />
      <rect x="16" y="10" width="4" height="7"  rx="1" fill="#3b82f6" />
      <rect x="21" y="5"  width="4" height="12" rx="1" fill="#ec4899" />
    </svg>
  );
}

function StackedBarsIcon({ active }: { active: boolean }) {
  return (
    <svg width="45" height="27" viewBox="0 0 30 18" aria-hidden className={active ? "opacity-100" : "opacity-35"}>
      {/* Group 1 */}
      <rect x="1"  y="10" width="11" height="7" rx="0" fill="#ec4899" />
      <rect x="1"  y="5"  width="11" height="5" rx="1" fill="#3b82f6" />
      {/* Group 2 */}
      <rect x="18" y="8"  width="11" height="9" rx="0" fill="#ec4899" />
      <rect x="18" y="3"  width="11" height="5" rx="1" fill="#3b82f6" />
    </svg>
  );
}

function StackedTotalLabels({
  chartData,
  monthTotals,
}: {
  chartData: Array<Record<string, string | number>>;
  monthTotals: number[];
}) {
  const xScale = useXAxisScale() as any;
  const yScale = useYAxisScale() as any;
  if (!xScale || !yScale) return null;
  if (chartData.length > 40) return null;

  return (
    <g>
      {chartData.map((row, i) => {
        const total = monthTotals[i];
        if (!total) return null;
        const x = xScale(row.month as string, { position: "middle" } as any) ?? 0;
        const y = yScale(total) - 6;
        const fmt =
          total >= 10000
            ? `$${(total / 1000).toFixed(0)}k`
            : total >= 1000
            ? `$${(total / 1000).toFixed(1)}k`
            : `$${Math.round(total)}`;
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize={10}
            fill="hsl(var(--muted-foreground))"
          >
            {fmt}
          </text>
        );
      })}
    </g>
  );
}

function StackedTotalCountLabels({
  chartData,
  monthTotals,
}: {
  chartData: Array<Record<string, string | number>>;
  monthTotals: number[];
}) {
  const xScale = useXAxisScale() as any;
  const yScale = useYAxisScale() as any;
  if (!xScale || !yScale) return null;
  if (chartData.length > 40) return null;

  return (
    <g>
      {chartData.map((row, i) => {
        const total = monthTotals[i];
        if (!total) return null;
        const x = xScale(row.month as string, { position: "middle" } as any) ?? 0;
        const y = yScale(total) - 6;
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize={10}
            fill="hsl(var(--muted-foreground))"
          >
            {total}
          </text>
        );
      })}
    </g>
  );
}

export function SpendingBySourceSection({ allSources, transactions, cleanedData, periodBoundStart, periodBoundEnd }: Props) {
  const router = useRouter();

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [view, setView] = useState<ViewMode>("monthly");
  const [chartMode, setChartMode] = useState<ChartMode>("stacked");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [sortBy, setSortBy] = useState<"amount" | "name" | "items">("amount");
  const [mounted, setMounted] = useState(false);

  const [spendingTableExpanded, setSpendingTableExpanded] = useState(true);
  const [countTableExpanded, setCountTableExpanded] = useState(true);
  const [spendingShowAllRows, setSpendingShowAllRows] = useState(false);
  const [countShowAllRows, setCountShowAllRows] = useState(false);

  const ROW_LIMIT = 8;

  // Inline edit state (modal only, cleaned-data mode only)
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const allSourcesRef = useRef(allSources);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => { allSourcesRef.current = allSources; }, [allSources]);

  // Load saved preferences on mount
  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((data: Record<string, unknown> | null) => {
        const prefs = data?.spendingBySource as { chartMode?: string; selectedSources?: unknown } | undefined;
        if (!prefs) return;
        if (prefs.chartMode === "grouped" || prefs.chartMode === "stacked") {
          setChartMode(prefs.chartMode);
        }
        if (Array.isArray(prefs.selectedSources)) {
          const valid = (prefs.selectedSources as unknown[])
            .filter((s): s is string => typeof s === "string" && allSourcesRef.current.includes(s));
          setSelectedSources(valid);
        }
      })
      .catch(() => {});
  }, []);

  // Save preferences whenever chartMode or selectedSources changes (debounced)
  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spendingBySource: { chartMode, selectedSources } }),
      }).catch(() => {});
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [chartMode, selectedSources]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Escape closes modal (or cancels active edit first)
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingSource) {
          setEditingSource(null);
          setEditError(null);
        } else {
          setModalOpen(false);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modalOpen, editingSource]);

  // Total spending and transaction count per source (for the modal)
  const { sourceTotals, sourceCounts } = useMemo(() => {
    const totals = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const t of transactions) {
      if (t.amount >= 0) continue;
      totals.set(t.source, (totals.get(t.source) ?? 0) + Math.abs(t.amount));
      counts.set(t.source, (counts.get(t.source) ?? 0) + 1);
    }
    return { sourceTotals: totals, sourceCounts: counts };
  }, [transactions]);

  const maxSourceTotal = useMemo(
    () => Math.max(...allSources.map((s) => sourceTotals.get(s) ?? 0), 1),
    [allSources, sourceTotals]
  );

  // Modal list: filtered + sorted
  const modalList = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    const filtered = q
      ? allSources.filter((s) => s.toLowerCase().includes(q))
      : [...allSources];
    if (sortBy === "amount") {
      filtered.sort((a, b) => (sourceTotals.get(b) ?? 0) - (sourceTotals.get(a) ?? 0));
    } else if (sortBy === "items") {
      filtered.sort((a, b) => (sourceCounts.get(b) ?? 0) - (sourceCounts.get(a) ?? 0));
    }
    return filtered;
  }, [allSources, modalSearch, sortBy, sourceTotals, sourceCounts]);

  // Search combobox suggestions (excludes already-selected)
  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allSources
      .filter((s) => s.toLowerCase().includes(q) && !selectedSources.includes(s))
      .slice(0, 10);
  }, [search, allSources, selectedSources]);

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const addSourceFromSearch = (source: string) => {
    setSelectedSources((prev) => (prev.includes(source) ? prev : [...prev, source]));
    setSearch("");
    setDropdownOpen(false);
    inputRef.current?.focus();
  };

  // Assign colors by insertion order for stable, consistent mapping
  const colorMap = useMemo(
    () =>
      Object.fromEntries(
        selectedSources.map((s, i) => [s, CATEGORY_COLORS[i % CATEGORY_COLORS.length]])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSources.join("\x00")]
  );

  // Global weekly bounds from all spending transactions so the weekly timeline
  // stays consistent regardless of which source is selected.
  const weeklyBounds = useMemo(() => {
    const keys = transactions
      .filter((t) => t.amount < 0)
      .map((t) => getISOWeekKey(new Date(t.date)));
    if (keys.length === 0) return { start: undefined, end: undefined };
    return {
      start: keys.reduce((a, b) => (a < b ? a : b)),
      end: keys.reduce((a, b) => (a > b ? a : b)),
    };
  }, [transactions]);

  const activeBoundStart = view === "monthly" ? periodBoundStart : weeklyBounds.start;
  const activeBoundEnd   = view === "monthly" ? periodBoundEnd   : weeklyBounds.end;

  const { rows: chartData, totals } = useMemo(
    () =>
      selectedSources.length > 0
        ? computeSourceData(transactions, selectedSources, view, activeBoundStart, activeBoundEnd)
        : { rows: [], totals: {} },
    [transactions, selectedSources, view, activeBoundStart, activeBoundEnd]
  );

  const hasData = chartData.length > 0;

  const monthTotals = useMemo(
    () => chartData.map((row) =>
      selectedSources.reduce((sum, s) => sum + (Number(row[s]) || 0), 0)
    ),
    [chartData, selectedSources]
  );

  const { rows: countChartData, totals: countTotals } = useMemo(
    () =>
      selectedSources.length > 0
        ? computeSourceCountData(transactions, selectedSources, view, activeBoundStart, activeBoundEnd)
        : { rows: [], totals: {} },
    [transactions, selectedSources, view, activeBoundStart, activeBoundEnd]
  );

  const countMonthTotals = useMemo(
    () => countChartData.map((row) =>
      selectedSources.reduce((sum, s) => sum + (Number(row[s]) || 0), 0)
    ),
    [countChartData, selectedSources]
  );

  // ── Rename handler ─────────────────────────────────────────────────────────
  const startEdit = (source: string) => {
    setEditingSource(source);
    setEditValue(source);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingSource(null);
    setEditError(null);
  };

  const handleRename = async (originalName: string) => {
    const newName = editValue.trim();
    if (!newName || newName === originalName) {
      cancelEdit();
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/sources/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName, newName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError((data as any).error ?? "Failed to save");
        setEditSaving(false);
        return;
      }
      // Keep selectedSources in sync with the new name
      if (selectedSources.includes(originalName)) {
        setSelectedSources((prev) =>
          Array.from(new Set(prev.map((s) => (s === originalName ? newName : s))))
        );
      }
      setEditingSource(null);
      router.refresh();
    } catch {
      setEditError("Network error");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Modal ──────────────────────────────────────────────────────────────────
  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          cancelEdit();
          setModalOpen(false);
        }
      }}
    >
      <div className="mx-4 flex w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">All Sources</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {allSources.length} sources · {selectedSources.length} selected
            </p>
          </div>
          <button
            onClick={() => { cancelEdit(); setModalOpen(false); }}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Controls: search + sort */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Filter sources…"
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {modalSearch && (
              <button
                onClick={() => setModalSearch("")}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted/30 p-0.5">
            {(["amount", "items", "name"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setSortBy(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  sortBy === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "amount" ? "Amount" : v === "items" ? "Items" : "Name"}
              </button>
            ))}
          </div>
        </div>

        {/* Source list */}
        <div className="flex-1 overflow-y-auto">
          {modalList.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No sources match your filter.
            </div>
          ) : (
            modalList.map((source) => {
              const total = sourceTotals.get(source) ?? 0;
              const count = sourceCounts.get(source) ?? 0;
              const pct = Math.round((total / maxSourceTotal) * 100);
              const isSelected = selectedSources.includes(source);
              const isEditing = editingSource === source;

              return (
                <div
                  key={source}
                  className={`group flex items-center border-b border-border/40 last:border-0 transition-colors ${
                    isEditing ? "bg-muted/30" : isSelected ? "bg-muted/20 hover:bg-muted/30" : "hover:bg-muted/40"
                  }`}
                >
                  {isEditing ? (
                    // ── Edit mode ───────────────────────────────────────────
                    <>
                      {/* Checkbox still toggleable while editing */}
                      <button
                        onClick={() => toggleSource(source)}
                        className="flex shrink-0 items-center px-5 py-3"
                        aria-label={isSelected ? "Deselect source" : "Select source"}
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30 hover:border-muted-foreground/60"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                      </button>

                      {/* Inline input */}
                      <div className="min-w-0 flex-1 py-3 pr-2">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value.toUpperCase());
                            setEditError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(source);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          disabled={editSaving}
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1 font-mono text-sm uppercase outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                          aria-label="Edit source name"
                        />
                        {editError && (
                          <p className="mt-1 text-[10px] text-destructive">{editError}</p>
                        )}
                      </div>

                      {/* Save / Cancel */}
                      <div className="flex shrink-0 items-center gap-1 px-3 py-3">
                        <button
                          onClick={() => handleRename(source)}
                          disabled={editSaving}
                          aria-label="Save"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={editSaving}
                          aria-label="Cancel"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    // ── Normal mode ─────────────────────────────────────────
                    <>
                      {/* Checkbox + name + bar — clicking toggles selection */}
                      <button
                        onClick={() => toggleSource(source)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-5 py-3 text-left"
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30 group-hover:border-muted-foreground/60"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{source}</div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary/50"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </button>

                      {/* Amount + count */}
                      <div className="shrink-0 py-3 text-right">
                        <div className="tabular-nums text-xs text-muted-foreground">
                          {formatCurrency(total)}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground/60">
                          {count} {count === 1 ? "item" : "items"}
                        </div>
                      </div>

                      {/* Edit pencil (cleaned data only) */}
                      {cleanedData && (
                        <button
                          onClick={() => startEdit(source)}
                          aria-label={`Edit name for ${source}`}
                          className="ml-2 mr-4 shrink-0 rounded p-1.5 text-muted-foreground/40 opacity-0 transition-all group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {/* Keep right spacing consistent when edit button is hidden */}
                      {!cleanedData && <div className="w-4 shrink-0 mr-4" />}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {modalList.length} {modalList.length === 1 ? "source" : "sources"}
            {modalSearch.trim() ? " matched" : ""}
          </span>
          <button
            onClick={() => { cancelEdit(); setModalOpen(false); }}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main section ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Section header + search (left) beside right controls */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: title stacked above search */}
          <div className="flex flex-1 min-w-0 flex-col gap-3">
            <h2 className="bg-gradient-to-r from-indigo-300 via-violet-300 to-pink-300 bg-clip-text text-base font-semibold uppercase tracking-wide text-transparent">
              Spending by source
            </h2>
            <div className="relative max-w-sm" ref={containerRef}>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-shadow focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (search.trim()) setDropdownOpen(true);
                  }}
                  placeholder="Search for a source…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setDropdownOpen(false);
                    }}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {dropdownOpen && search.trim() && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                  {suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <button
                        key={s}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addSourceFromSearch(s);
                        }}
                        className="w-full truncate px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No matching sources
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground self-start"
            >
              <List className="h-3.5 w-3.5" />
              See all sources
            </button>
          </div>

          {/* Right controls */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            {/* Monthly / Weekly toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
              {(["monthly", "weekly"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                    view === v
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "monthly" ? "Monthly" : "Weekly"}
                </button>
              ))}
            </div>

            {/* Chart mode toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
              {(["grouped", "stacked"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  title={mode === "grouped" ? "Grouped bars" : "Stacked bars"}
                  aria-label={mode === "grouped" ? "Switch to grouped bar chart" : "Switch to stacked bar chart"}
                  className={`flex items-center rounded-md px-2 py-1.5 transition-colors ${
                    chartMode === mode
                      ? "bg-card shadow-sm"
                      : "hover:bg-muted/40"
                  }`}
                >
                  {mode === "grouped"
                    ? <GroupedBarsIcon active={chartMode === "grouped"} />
                    : <StackedBarsIcon active={chartMode === "stacked"} />
                  }
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected source chips */}
        {selectedSources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSources.map((source) => (
              <span
                key={source}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity"
                style={{
                  borderColor: colorMap[source],
                  color: colorMap[source],
                  backgroundColor: colorMap[source] + "1a",
                  opacity: hoveredSource && hoveredSource !== source ? 0.35 : 1,
                }}
                onMouseEnter={() => setHoveredSource(source)}
                onMouseLeave={() => setHoveredSource(null)}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorMap[source] }}
                />
                <span className="max-w-[200px] truncate">{source}</span>
                <button
                  onClick={() => toggleSource(source)}
                  aria-label={`Remove ${source}`}
                  className="ml-0.5 transition-opacity hover:opacity-60"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        {selectedSources.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Search for a source above or use &ldquo;See all sources&rdquo; to select.
          </div>
        ) : !hasData ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No spending data found for the selected sources in this period.
          </div>
        ) : (
          <>
            {/* Bar chart (grouped or stacked) */}
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: chartMode === "stacked" ? 24 : 4, right: 16, bottom: 4, left: 8 }}
                  barCategoryGap="10%"
                  barGap={2}
                  onMouseMove={(state) => setHoveredMonth((state as any).activeLabel ?? null)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.6}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="month"
                    tick={
                      isMobile
                        ? false
                        : { fontSize: 10, angle: -90, textAnchor: "end", dy: -4, dx: -4 }
                    }
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    interval={0}
                    height={isMobile ? 8 : 56}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`
                    }
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={52}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow text-xs">
                          <p className="mb-1 font-semibold">{label}</p>
                          {payload.map((p: any) => (
                            <div key={p.dataKey} className="mt-0.5 flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: p.fill }}
                              />
                              <span className="max-w-[180px] truncate">
                                {p.dataKey}: {formatCurrency(Number(p.value))}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                  />
                  {selectedSources.map((source, i) => {
                    const isTop = i === selectedSources.length - 1;
                    return (
                      <Bar
                        key={source}
                        dataKey={source}
                        fill={colorMap[source]}
                        fillOpacity={hoveredSource && hoveredSource !== source ? 0.2 : 1}
                        maxBarSize={chartMode === "stacked" ? 48 : 32}
                        radius={
                          chartMode === "stacked" && !isTop
                            ? [0, 0, 0, 0]
                            : [4, 4, 0, 0]
                        }
                        stackId={chartMode === "stacked" ? "a" : undefined}
                        isAnimationActive={false}
                      />
                    );
                  })}
                  {chartMode === "stacked" && (
                    <StackedTotalLabels
                      chartData={chartData}
                      monthTotals={monthTotals}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly totals table */}
            <div className="rounded-lg border border-border">
              <button
                onClick={() => setSpendingTableExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left"
              >
                <span className="text-xs font-medium text-muted-foreground">Monthly breakdown</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                    spendingTableExpanded ? "" : "-rotate-90"
                  }`}
                />
              </button>
              {spendingTableExpanded && (
                <>
                <div
                  className={`overflow-x-auto border-t border-border ${
                    !spendingShowAllRows && chartData.length > ROW_LIMIT ? "max-h-80 overflow-y-auto" : ""
                  }`}
                >
                  <table className="w-full min-w-max text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr className="border-b border-border bg-muted/30">
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Month
                        </th>
                        {selectedSources.map((source) => (
                          <th
                            key={source}
                            className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-medium text-muted-foreground transition-opacity cursor-default"
                            style={{ opacity: hoveredSource && hoveredSource !== source ? 0.35 : 1 }}
                            onMouseEnter={() => setHoveredSource(source)}
                            onMouseLeave={() => setHoveredSource(null)}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: colorMap[source] }}
                              />
                              <span className="max-w-[140px] truncate">{source}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row, i) => (
                        <tr
                          key={row.month as string}
                          className={`transition-colors ${
                            hoveredMonth === row.month
                              ? "bg-primary/10"
                              : i % 2 !== 0
                              ? "bg-muted/20"
                              : ""
                          }`}
                        >
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">
                            {row.month}
                          </td>
                          {selectedSources.map((source) => (
                            <td
                              key={source}
                              className="whitespace-nowrap px-4 py-2 text-right text-xs tabular-nums transition-opacity cursor-default"
                              style={{ opacity: hoveredSource && hoveredSource !== source ? 0.35 : 1 }}
                              onMouseEnter={() => setHoveredSource(source)}
                              onMouseLeave={() => setHoveredSource(null)}
                            >
                              {(row[source] as number) > 0 ? (
                                formatCurrency(row[source] as number)
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-card">
                      <tr className="border-t border-border bg-muted/30 font-semibold">
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                          Total
                        </td>
                        {selectedSources.map((source) => (
                          <td
                            key={source}
                            className="whitespace-nowrap px-4 py-2.5 text-right text-xs tabular-nums transition-opacity cursor-default"
                            style={{ opacity: hoveredSource && hoveredSource !== source ? 0.35 : 1 }}
                            onMouseEnter={() => setHoveredSource(source)}
                            onMouseLeave={() => setHoveredSource(null)}
                          >
                            {formatCurrency(totals[source] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {chartData.length > ROW_LIMIT && (
                  <div className="border-t border-border px-4 py-2 text-center">
                    <button
                      onClick={() => setSpendingShowAllRows((v) => !v)}
                      className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {spendingShowAllRows ? "Collapse" : `Show all ${chartData.length} rows`}
                    </button>
                  </div>
                )}
                </>
              )}
            </div>

            {/* ── Transaction count section ─────────────────────────────── */}
            <h3 className="mt-6 bg-gradient-to-r from-indigo-300 via-violet-300 to-pink-300 bg-clip-text text-base font-semibold uppercase tracking-wide text-transparent">
              Transaction count by source
            </h3>

            {/* Count bar chart */}
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={countChartData}
                  margin={{ top: chartMode === "stacked" ? 24 : 4, right: 16, bottom: 4, left: 8 }}
                  barCategoryGap="10%"
                  barGap={2}
                  onMouseMove={(state) => setHoveredMonth((state as any).activeLabel ?? null)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.6}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="month"
                    tick={
                      isMobile
                        ? false
                        : { fontSize: 10, angle: -90, textAnchor: "end", dy: -4, dx: -4 }
                    }
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    interval={0}
                    height={isMobile ? 8 : 56}
                  />
                  <YAxis
                    tickFormatter={(v) => String(Math.round(v))}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={40}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow text-xs">
                          <p className="mb-1 font-semibold">{label}</p>
                          {payload.map((p: any) => (
                            <div key={p.dataKey} className="mt-0.5 flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: p.fill }}
                              />
                              <span className="max-w-[180px] truncate">
                                {p.dataKey}: {Number(p.value).toLocaleString()} {Number(p.value) === 1 ? "item" : "items"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                  />
                  {selectedSources.map((source, i) => {
                    const isTop = i === selectedSources.length - 1;
                    return (
                      <Bar
                        key={source}
                        dataKey={source}
                        fill={colorMap[source]}
                        fillOpacity={hoveredSource && hoveredSource !== source ? 0.2 : 1}
                        maxBarSize={chartMode === "stacked" ? 48 : 32}
                        radius={
                          chartMode === "stacked" && !isTop
                            ? [0, 0, 0, 0]
                            : [4, 4, 0, 0]
                        }
                        stackId={chartMode === "stacked" ? "b" : undefined}
                        isAnimationActive={false}
                      />
                    );
                  })}
                  {chartMode === "stacked" && (
                    <StackedTotalCountLabels
                      chartData={countChartData}
                      monthTotals={countMonthTotals}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly count table */}
            <div className="rounded-lg border border-border">
              <button
                onClick={() => setCountTableExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left"
              >
                <span className="text-xs font-medium text-muted-foreground">Monthly breakdown</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                    countTableExpanded ? "" : "-rotate-90"
                  }`}
                />
              </button>
              {countTableExpanded && (
                <>
                <div
                  className={`overflow-x-auto border-t border-border ${
                    !countShowAllRows && countChartData.length > ROW_LIMIT ? "max-h-80 overflow-y-auto" : ""
                  }`}
                >
                  <table className="w-full min-w-max text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr className="border-b border-border bg-muted/30">
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Month
                        </th>
                        {selectedSources.map((source) => (
                          <th
                            key={source}
                            className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-medium text-muted-foreground transition-opacity cursor-default"
                            style={{ opacity: hoveredSource && hoveredSource !== source ? 0.35 : 1 }}
                            onMouseEnter={() => setHoveredSource(source)}
                            onMouseLeave={() => setHoveredSource(null)}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: colorMap[source] }}
                              />
                              <span className="max-w-[140px] truncate">{source}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {countChartData.map((row, i) => (
                        <tr
                          key={row.month as string}
                          className={`transition-colors ${
                            hoveredMonth === row.month
                              ? "bg-primary/10"
                              : i % 2 !== 0
                              ? "bg-muted/20"
                              : ""
                          }`}
                        >
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">
                            {row.month}
                          </td>
                          {selectedSources.map((source) => (
                            <td
                              key={source}
                              className="whitespace-nowrap px-4 py-2 text-right text-xs tabular-nums transition-opacity cursor-default"
                              style={{ opacity: hoveredSource && hoveredSource !== source ? 0.35 : 1 }}
                              onMouseEnter={() => setHoveredSource(source)}
                              onMouseLeave={() => setHoveredSource(null)}
                            >
                              {(row[source] as number) > 0 ? (
                                (row[source] as number).toLocaleString()
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-card">
                      <tr className="border-t border-border bg-muted/30 font-semibold">
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                          Total
                        </td>
                        {selectedSources.map((source) => (
                          <td
                            key={source}
                            className="whitespace-nowrap px-4 py-2.5 text-right text-xs tabular-nums transition-opacity cursor-default"
                            style={{ opacity: hoveredSource && hoveredSource !== source ? 0.35 : 1 }}
                            onMouseEnter={() => setHoveredSource(source)}
                            onMouseLeave={() => setHoveredSource(null)}
                          >
                            {(countTotals[source] ?? 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {countChartData.length > ROW_LIMIT && (
                  <div className="border-t border-border px-4 py-2 text-center">
                    <button
                      onClick={() => setCountShowAllRows((v) => !v)}
                      className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {countShowAllRows ? "Collapse" : `Show all ${countChartData.length} rows`}
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {mounted && modalOpen && createPortal(modal, document.body)}
    </>
  );
}
