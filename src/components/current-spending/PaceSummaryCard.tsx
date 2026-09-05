"use client";

import { Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurrentSpendingResult, PaceStatus, ViewMode } from "@/lib/currentSpending";
import { fmtUSD0 } from "./format";

interface Props {
  result: CurrentSpendingResult;
  view: ViewMode;
}

function verdictFor(status: PaceStatus, delta: number | null, isComplete: boolean) {
  const abs = delta !== null ? fmtUSD0(Math.abs(delta)) : "";
  switch (status) {
    case "under":
      return {
        Icon: TrendingDown,
        className: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
        text: isComplete
          ? `Finished ${abs} under your average`
          : `On pace to finish ${abs} under your average`,
      };
    case "over":
      return {
        Icon: TrendingUp,
        className: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        text: isComplete
          ? `Finished ${abs} over your average`
          : `On pace to finish ${abs} over your average`,
      };
    case "even":
      return {
        Icon: Minus,
        className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        text: isComplete ? "Finished right at your average" : "Right on your usual pace",
      };
    default:
      return {
        Icon: Info,
        className: "border-border bg-muted/40 text-muted-foreground",
        text: "Not enough history to compare yet",
      };
  }
}

function MiniStat({ label, value, sub }: { label: string; value: number | null; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-base font-semibold tabular-nums">
        {value !== null ? fmtUSD0(value) : "—"}
      </dd>
      {sub && <dd className="truncate text-[11px] text-muted-foreground">{sub}</dd>}
    </div>
  );
}

export function PaceSummaryCard({ result, view }: Props) {
  const noun = view === "week" ? "week" : "month";
  const {
    period,
    spent,
    status,
    delta,
    projected,
    avgFull,
    typicalToDate,
    benchmark,
    remainingBudget,
    perDayRemaining,
    prevPeriod,
  } = result;

  const verdict = verdictFor(status, delta, period.isComplete);

  // The bar fills against the benchmark when one is set, otherwise the average.
  const barTarget = benchmark.value ?? avgFull;
  const barTargetLabel = benchmark.value !== null ? "benchmark" : "average";
  const scale = barTarget !== null && barTarget > 0 ? barTarget : Math.max(spent, 1);
  const spentPct = Math.min(100, (spent / scale) * 100);
  const projectedPct = projected !== null ? Math.min(100, (projected / scale) * 100) : spentPct;
  const timePct = (period.elapsedDays / period.totalDays) * 100;
  const overNow = barTarget !== null && spent > barTarget;
  const overProjected = barTarget !== null && projected !== null && projected > barTarget;
  const barClass = overNow
    ? "bg-rose-500"
    : overProjected
      ? "bg-amber-400"
      : "bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400";
  const ghostClass = overNow
    ? "bg-rose-500/30"
    : overProjected
      ? "bg-amber-400/30"
      : "bg-violet-400/25";

  const benchmarkSub =
    benchmark.source === "income"
      ? `${benchmark.percent}% of income`
      : benchmark.source === "manual"
        ? "manual"
        : "not set";

  return (
    <section
      aria-label="Spending summary"
      className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-pink-500/10 p-4 sm:p-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-500/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-indigo-500/25 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {period.isComplete ? `This ${noun}` : `This ${noun} so far`}
          </p>
          <p className="text-xs text-muted-foreground">
            Day {period.elapsedDays} of {period.totalDays}
          </p>
        </div>
        <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{fmtUSD0(spent)}</p>

        <div
          className={cn(
            "mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-medium",
            verdict.className,
          )}
        >
          <verdict.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{verdict.text}</span>
        </div>

        {benchmark.value !== null && projected !== null && (
          <p className="mt-2 text-sm text-muted-foreground">
            {period.isComplete ? "Finished at" : "Projected"} {fmtUSD0(projected)} ·{" "}
            <span
              className={
                projected <= benchmark.value
                  ? "text-green-600 dark:text-green-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              {fmtUSD0(Math.abs(benchmark.value - projected))}{" "}
              {projected <= benchmark.value ? "under" : "over"} benchmark
            </span>
          </p>
        )}

        <div className="mt-4">
          <div
            className="relative h-3 w-full rounded-full bg-muted/70"
            role="img"
            aria-label={
              barTarget !== null
                ? `${fmtUSD0(spent)} of ${fmtUSD0(barTarget)} ${barTargetLabel}`
                : `${fmtUSD0(spent)} spent`
            }
          >
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full", ghostClass)}
              style={{ width: `${projectedPct}%` }}
            />
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full", barClass)}
              style={{ width: `${spentPct}%` }}
            />
            {barTarget !== null && !period.isComplete && (
              <div
                className="absolute -bottom-1 -top-1 w-0.5 rounded bg-foreground/70"
                style={{ left: `calc(${timePct}% - 1px)` }}
                title={`Day ${period.elapsedDays} of ${period.totalDays}`}
              />
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
            <span>
              {barTarget !== null
                ? `${fmtUSD0(spent)} of ${fmtUSD0(barTarget)} ${barTargetLabel}`
                : "No benchmark or average yet"}
            </span>
            {remainingBudget !== null && (
              <span className={remainingBudget < 0 ? "text-rose-600 dark:text-rose-400" : undefined}>
                {remainingBudget >= 0
                  ? `${fmtUSD0(remainingBudget)} left`
                  : `${fmtUSD0(-remainingBudget)} over`}
                {perDayRemaining !== null && perDayRemaining > 0
                  ? ` · ${fmtUSD0(perDayRemaining)}/day`
                  : ""}
              </span>
            )}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
          <MiniStat label="Typical by now" value={typicalToDate} />
          <MiniStat label={`Avg ${noun}`} value={avgFull} />
          <MiniStat label="Benchmark" value={benchmark.value} sub={benchmarkSub} />
        </dl>

        {prevPeriod && (
          <p className="mt-3 text-xs text-muted-foreground">
            {period.isComplete
              ? `Last ${noun}: ${fmtUSD0(prevPeriod.full)}`
              : `Same point last ${noun}: ${fmtUSD0(prevPeriod.toDate)} · finished at ${fmtUSD0(prevPeriod.full)}`}
          </p>
        )}
      </div>
    </section>
  );
}
