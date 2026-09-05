"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ClientOnly } from "@/components/dashboard/ClientOnly";
import { SyncBankButton } from "@/components/dashboard/SyncBankButton";
import { cn } from "@/lib/utils";
import {
  BASELINE_OPTIONS,
  computeCurrentSpending,
  formatDayLong,
  formatDayShort,
  type BaselineOption,
  type CurrentSpendingData,
  type CurrentSpendingPrefs,
  type ViewMode,
} from "@/lib/currentSpending";
import { PaceSummaryCard } from "./PaceSummaryCard";
import { PaceChart } from "./PaceChart";
import { RecentPeriodsChart } from "./RecentPeriodsChart";
import { CategoryComparisonList } from "./CategoryComparisonList";
import { BenchmarkDialog } from "./BenchmarkDialog";
import { fmtUSD0 } from "./format";

interface Props {
  data: CurrentSpendingData;
  initialPrefs: CurrentSpendingPrefs;
  todayKey: string;
  hasBankConnection: boolean;
  lastSyncedAt: string | null;
}

function savePrefs(prefs: CurrentSpendingPrefs) {
  fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentSpending: prefs }),
  }).catch(() => {});
}

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export function CurrentSpendingClient({
  data,
  initialPrefs,
  todayKey,
  hasBankConnection,
  lastSyncedAt,
}: Props) {
  const [prefs, setPrefs] = useState<CurrentSpendingPrefs>(initialPrefs);
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);

  const result = useMemo(
    () => computeCurrentSpending(data, prefs, todayKey),
    [data, prefs, todayKey],
  );

  const updatePrefs = (patch: Partial<CurrentSpendingPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const noun = prefs.view === "week" ? "week" : "month";
  const baselineLabel =
    BASELINE_OPTIONS.find((o) => o.value === prefs.baseline)?.label.toLowerCase() ?? "";
  const { period, baseline } = result;
  const hasBaseline = baseline.periodsUsed > 0;

  return (
    <div className="flex flex-col gap-4 [&_.recharts-wrapper_*]:outline-none">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-300 via-violet-300 to-pink-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
            Current Spending
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.hasData
              ? `${period.label} · day ${period.elapsedDays} of ${period.totalDays}${
                  result.lagDays > 0 && !result.isStale && result.latestDay
                    ? ` · transactions through ${formatDayShort(result.latestDay)}`
                    : ""
                }`
              : "A quick read on whether this week is going well."}
          </p>
        </div>
        {hasBankConnection && <SyncBankButton lastSyncedAt={lastSyncedAt} />}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="View"
            className="flex flex-1 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 sm:flex-none"
          >
            {VIEWS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => updatePrefs({ view: v.value })}
                aria-pressed={prefs.view === v.value}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4",
                  prefs.view === v.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setBenchmarkOpen(true)}
            className="h-[42px] gap-2 px-3"
          >
            <Target className="h-4 w-4" aria-hidden="true" />
            Benchmark
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="shrink-0">Average over</span>
          <div className="flex-1 sm:w-44 sm:flex-none">
            <Select
              value={prefs.baseline}
              onChange={(e) => updatePrefs({ baseline: e.target.value as BaselineOption })}
              aria-label="Window used to calculate your average spending"
              className="h-[42px] text-foreground"
            >
              {BASELINE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </label>
      </div>

      {result.isStale && result.latestDay && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <p>
            Your newest transaction is from{" "}
            <strong className="font-semibold">{formatDayLong(result.latestDay)}</strong>, so this
            page is shown as of that date.{" "}
            <Link href="/files" className="underline underline-offset-2">
              Upload a CSV
            </Link>
            {hasBankConnection ? " or sync your bank" : ""} to see this {noun}.
          </p>
        </div>
      )}

      {!result.hasData ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No transactions yet.{" "}
          <Link href="/files" className="text-foreground underline underline-offset-2">
            Upload a CSV
          </Link>{" "}
          or connect your bank to see how your spending is pacing.
        </div>
      ) : (
        <>
          <PaceSummaryCard result={result} view={prefs.view} />

          {/* Pace chart */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Spending pace
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Running total this {noun} against a typical {noun}
              {hasBaseline ? ` (average of ${baselineLabel})` : ""}.
            </p>
            <div className="mt-3">
              <ClientOnly fallbackHeight="h-56 sm:h-64">
                <PaceChart
                  rows={result.pace}
                  view={prefs.view}
                  benchmark={result.benchmark.value}
                  elapsedDays={period.elapsedDays}
                  spent={result.spent}
                />
              </ClientOnly>
            </div>
          </section>

          {/* Recent periods */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {prefs.view === "week" ? "Last 8 weeks" : "Last 6 months"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Total spent each {noun}. The current {noun} is shown so far.
            </p>
            <div className="mt-3">
              <ClientOnly fallbackHeight="h-56 sm:h-64">
                <RecentPeriodsChart
                  periods={result.recent}
                  view={prefs.view}
                  avgFull={result.avgFull}
                  benchmark={result.benchmark.value}
                />
              </ClientOnly>
            </div>
          </section>

          {/* Categories */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Where it&apos;s going
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasBaseline
                ? `Spent so far vs. what you typically spend by day ${period.elapsedDays} of a ${noun}, sorted by the biggest change.`
                : `Spent so far this ${noun}. Comparisons appear once you have a full prior ${noun} of history.`}
            </p>
            <div className="mt-4">
              <CategoryComparisonList
                rows={result.categories}
                noun={noun}
                hasBaseline={hasBaseline}
              />
            </div>
          </section>

          <p className="px-1 text-xs text-muted-foreground">
            {hasBaseline
              ? `Averages use ${baseline.periodsUsed} complete ${noun}${baseline.periodsUsed === 1 ? "" : "s"} (${baseline.earliestStart ? formatDayLong(baseline.earliestStart) : ""} – ${baseline.latestEnd ? formatDayLong(baseline.latestEnd) : ""}).`
              : "Averages need at least one complete prior period."}{" "}
            Spending counts money out
            {prefs.includeTransfersOut ? ", including transfers out." : ", excluding transfers out."}
            {result.benchmark.source === "income" && result.benchmark.incomeAvgPerPeriod !== null
              ? ` Income averages ${fmtUSD0(result.benchmark.incomeAvgPerPeriod)} per ${noun}.`
              : ""}
          </p>
        </>
      )}

      <BenchmarkDialog
        open={benchmarkOpen}
        onOpenChange={setBenchmarkOpen}
        prefs={prefs}
        view={prefs.view}
        incomeAvgPerPeriod={result.benchmark.incomeAvgPerPeriod}
        onSave={updatePrefs}
      />
    </div>
  );
}
