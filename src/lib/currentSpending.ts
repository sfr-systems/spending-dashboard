/**
 * Pure computation for the Current Spending page.
 *
 * All dates are handled as UTC calendar days ("YYYY-MM-DD") to match how
 * transaction dates are stored. The server aggregates transactions into
 * daily per-category totals; the client runs `computeCurrentSpending` so
 * switching between weekly/monthly views and baselines is instant.
 */

export type ViewMode = "week" | "month";
export type BaselineOption = "1m" | "3m" | "6m" | "1y" | "all";
export type BenchmarkMode = "income" | "manual";
export type PaceStatus = "under" | "over" | "even" | "unknown";

export interface BenchmarkConfig {
  mode: BenchmarkMode;
  /** For income mode: spend up to this percent of average income (100 = all of it). */
  incomePercent: number;
  /** For manual mode: dollar amount per `manualUnit`. */
  manualAmount: number;
  manualUnit: ViewMode;
}

export interface CurrentSpendingPrefs {
  view: ViewMode;
  baseline: BaselineOption;
  benchmark: BenchmarkConfig;
  includeTransfersOut: boolean;
}

export const DEFAULT_PREFS: CurrentSpendingPrefs = {
  view: "week",
  baseline: "6m",
  benchmark: { mode: "income", incomePercent: 100, manualAmount: 0, manualUnit: "month" },
  includeTransfersOut: false,
};

export const BASELINE_OPTIONS: { value: BaselineOption; label: string }[] = [
  { value: "1m", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All history" },
];

export const TRANSFER_OUT_CATEGORY = "Transfer Out";

/** Categories that count as income for the income-based benchmark. */
export const INCOME_CATEGORY_RE = /income|payroll|salary|paycheck|wages/i;

/** If the newest transaction is older than this, anchor "current" to it instead of today. */
export const STALE_AFTER_DAYS = 10;

/** [day, categoryIndex, amount] — amount is positive dollars spent. */
export type SpendRow = [string, number, number];
/** [day, amount] — positive dollars of income. */
export type IncomeRow = [string, number];

export interface CurrentSpendingData {
  categories: string[];
  spend: SpendRow[];
  income: IncomeRow[];
}

export interface PeriodInfo {
  key: string;
  label: string;
  start: string;
  endInclusive: string;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  isComplete: boolean;
}

export interface PaceRow {
  day: number;
  label: string;
  current: number | null;
  typical: number | null;
}

export interface RecentPeriod {
  key: string;
  label: string;
  fullLabel: string;
  spent: number;
  isCurrent: boolean;
  vsAvg: number | null;
}

export interface CategoryComparison {
  category: string;
  current: number;
  typical: number | null;
  typicalFull: number | null;
  delta: number | null;
  pct: number | null;
}

export interface CurrentSpendingResult {
  hasData: boolean;
  anchorDay: string;
  latestDay: string | null;
  /** Days between the newest transaction and today (0 when data is current). */
  lagDays: number;
  isStale: boolean;
  period: PeriodInfo;
  spent: number;
  typicalToDate: number | null;
  avgFull: number | null;
  projected: number | null;
  delta: number | null;
  pct: number | null;
  status: PaceStatus;
  baseline: {
    periodsUsed: number;
    requested: number | null;
    earliestStart: string | null;
    latestEnd: string | null;
  };
  benchmark: {
    value: number | null;
    source: BenchmarkMode | "none";
    incomeAvgPerPeriod: number | null;
    percent: number;
  };
  remainingBudget: number | null;
  perDayRemaining: number | null;
  prevPeriod: { label: string; toDate: number; full: number } | null;
  pace: PaceRow[];
  recent: RecentPeriod[];
  categories: CategoryComparison[];
}

// ---------------------------------------------------------------------------
// Date helpers (UTC)
// ---------------------------------------------------------------------------

const MS_DAY = 86_400_000;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_DAY);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_DAY);
}

/** Start of the week (Monday) or month containing `d`. */
export function periodStartFor(d: Date, mode: ViewMode): Date {
  if (mode === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const midnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const daysSinceMonday = (midnight.getUTCDay() + 6) % 7;
  return addDays(midnight, -daysSinceMonday);
}

export function addPeriods(start: Date, n: number, mode: ViewMode): Date {
  if (mode === "month") return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + n, 1));
  return addDays(start, 7 * n);
}

function periodDays(start: Date, mode: ViewMode): number {
  return daysBetween(start, addPeriods(start, 1, mode));
}

export function formatDayLong(key: string): string {
  const d = parseDay(key);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatDayShort(key: string): string {
  const d = parseDay(key);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function periodLabel(start: Date, mode: ViewMode): string {
  if (mode === "month") return `${MONTHS_LONG[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  const end = addDays(start, 6);
  const sm = MONTHS_SHORT[start.getUTCMonth()];
  const em = MONTHS_SHORT[end.getUTCMonth()];
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${sm} ${start.getUTCDate()}–${end.getUTCDate()}`;
  }
  return `${sm} ${start.getUTCDate()} – ${em} ${end.getUTCDate()}`;
}

function periodShortLabel(start: Date, mode: ViewMode): string {
  if (mode === "month") {
    const m = MONTHS_SHORT[start.getUTCMonth()];
    return start.getUTCMonth() === 0 ? `${m} '${String(start.getUTCFullYear()).slice(2)}` : m;
  }
  return `${start.getUTCMonth() + 1}/${start.getUTCDate()}`;
}

function baselineCount(option: BaselineOption, mode: ViewMode): number | null {
  if (option === "all") return null;
  const months = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 }[option];
  return mode === "month" ? months : Math.round((months * 52) / 12);
}

export function convertBenchmarkUnit(amount: number, from: ViewMode, to: ViewMode): number {
  if (from === to) return amount;
  return from === "month" ? (amount * 12) / 52 : (amount * 52) / 12;
}

// ---------------------------------------------------------------------------
// Server-side data shaping + preference sanitising
// ---------------------------------------------------------------------------

export interface TxnForCurrentSpending {
  day: string; // YYYY-MM-DD
  amount: number; // negative = money out
  category: string;
}

export function buildCurrentSpendingData(txns: TxnForCurrentSpending[]): CurrentSpendingData {
  const categories: string[] = [];
  const catIndex = new Map<string, number>();
  const spendMap = new Map<string, number>(); // `${day}|${catIdx}` -> amount
  const incomeMap = new Map<string, number>();

  for (const t of txns) {
    if (!Number.isFinite(t.amount) || t.amount === 0) continue;
    if (t.amount < 0) {
      const cat = t.category || "Uncategorized";
      let idx = catIndex.get(cat);
      if (idx === undefined) {
        idx = categories.length;
        categories.push(cat);
        catIndex.set(cat, idx);
      }
      const key = `${t.day}|${idx}`;
      spendMap.set(key, (spendMap.get(key) ?? 0) + Math.abs(t.amount));
    } else if (INCOME_CATEGORY_RE.test(t.category)) {
      incomeMap.set(t.day, (incomeMap.get(t.day) ?? 0) + t.amount);
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const spend: SpendRow[] = Array.from(spendMap.entries()).map(([key, amount]) => {
    const [day, idx] = key.split("|");
    return [day, Number(idx), round(amount)];
  });
  const income: IncomeRow[] = Array.from(incomeMap.entries()).map(([day, amount]) => [day, round(amount)]);
  return { categories, spend, income };
}

/** Never trust stored JSON: coerce whatever is in preferences into a valid shape. */
export function sanitizePrefs(raw: unknown): CurrentSpendingPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const b = (r.benchmark && typeof r.benchmark === "object" ? r.benchmark : {}) as Record<string, unknown>;
  const view: ViewMode = r.view === "month" ? "month" : "week";
  const baseline = BASELINE_OPTIONS.some((o) => o.value === r.baseline)
    ? (r.baseline as BaselineOption)
    : DEFAULT_PREFS.baseline;
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    view,
    baseline,
    benchmark: {
      mode: b.mode === "manual" ? "manual" : "income",
      incomePercent: num(b.incomePercent, 100, 1, 500),
      manualAmount: num(b.manualAmount, 0, 0, 10_000_000),
      manualUnit: b.manualUnit === "week" ? "week" : "month",
    },
    includeTransfersOut: r.includeTransfersOut === true,
  };
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

interface PeriodProfile {
  start: Date;
  len: number;
  daily: number[];
  full: number;
  toDate: number;
  catToDate: Map<string, number>;
  catFull: Map<string, number>;
  income: number;
}

export function computeCurrentSpending(
  data: CurrentSpendingData,
  prefs: CurrentSpendingPrefs,
  todayKey: string,
): CurrentSpendingResult {
  const mode = prefs.view;

  // 1. Index daily totals.
  const dayCat = new Map<string, Map<string, number>>();
  const dayTotal = new Map<string, number>();
  const dayIncome = new Map<string, number>();
  let firstDay: string | null = null;
  let latestDay: string | null = null;
  const track = (day: string) => {
    if (firstDay === null || day < firstDay) firstDay = day;
    if (latestDay === null || day > latestDay) latestDay = day;
  };

  for (const [day, ci, amount] of data.spend) {
    track(day);
    const cat = data.categories[ci] ?? "Uncategorized";
    if (!prefs.includeTransfersOut && cat === TRANSFER_OUT_CATEGORY) continue;
    dayTotal.set(day, (dayTotal.get(day) ?? 0) + amount);
    let cm = dayCat.get(day);
    if (!cm) {
      cm = new Map();
      dayCat.set(day, cm);
    }
    cm.set(cat, (cm.get(cat) ?? 0) + amount);
  }
  for (const [day, amount] of data.income) {
    track(day);
    dayIncome.set(day, (dayIncome.get(day) ?? 0) + amount);
  }

  const hasData = firstDay !== null;
  const today = parseDay(todayKey);
  const latest = latestDay ? parseDay(latestDay) : null;
  // Bank data usually lags a day or two, so "now" is the newest transaction
  // day whenever that is earlier than today. Comparing through the same day
  // of prior periods keeps the verdict apples-to-apples instead of counting
  // unposted days as zero spend.
  const lagDays = latest !== null ? Math.max(0, daysBetween(latest, today)) : 0;
  const isStale = latest !== null && lagDays > STALE_AFTER_DAYS;
  const anchor = latest !== null && latest < today ? latest : today;
  const first = firstDay ? parseDay(firstDay) : null;

  // 2. Current period geometry.
  const start = periodStartFor(anchor, mode);
  const totalDays = periodDays(start, mode);
  const elapsedDays = daysBetween(start, anchor) + 1;
  const remainingDays = totalDays - elapsedDays;

  const profile = (pStart: Date): PeriodProfile => {
    const len = periodDays(pStart, mode);
    const n = Math.min(elapsedDays, len);
    const daily: number[] = new Array(len).fill(0);
    const catToDate = new Map<string, number>();
    const catFull = new Map<string, number>();
    let income = 0;
    let full = 0;
    let toDate = 0;
    for (let i = 0; i < len; i++) {
      const k = toDayKey(addDays(pStart, i));
      const v = dayTotal.get(k) ?? 0;
      daily[i] = v;
      full += v;
      if (i < n) toDate += v;
      income += dayIncome.get(k) ?? 0;
      const cm = dayCat.get(k);
      if (cm) {
        for (const [c, a] of cm) {
          catFull.set(c, (catFull.get(c) ?? 0) + a);
          if (i < n) catToDate.set(c, (catToDate.get(c) ?? 0) + a);
        }
      }
    }
    return { start: pStart, len, daily, full, toDate, catToDate, catFull, income };
  };

  const current = profile(start);
  const spent = current.toDate;

  // 3. Baseline: prior complete periods with any spending.
  const requested = baselineCount(prefs.baseline, mode);
  const baseline: PeriodProfile[] = [];
  for (let i = 1; requested === null || i <= requested; i++) {
    const pStart = addPeriods(start, -i, mode);
    if (!first || pStart < first) break;
    const p = profile(pStart);
    if (p.full <= 0) continue;
    baseline.push(p);
  }
  const nB = baseline.length;

  const avgFull = nB ? baseline.reduce((s, p) => s + p.full, 0) / nB : null;
  const typicalToDate = nB ? baseline.reduce((s, p) => s + p.toDate, 0) / nB : null;
  const incomeAvg = nB ? baseline.reduce((s, p) => s + p.income, 0) / nB : null;

  const catTypical = new Map<string, number>();
  const catTypicalFull = new Map<string, number>();
  for (const p of baseline) {
    for (const [c, a] of p.catToDate) catTypical.set(c, (catTypical.get(c) ?? 0) + a / nB);
    for (const [c, a] of p.catFull) catTypicalFull.set(c, (catTypicalFull.get(c) ?? 0) + a / nB);
  }

  // 4. Pace vs. typical.
  let delta: number | null = null;
  let pct: number | null = null;
  let projected: number | null = null;
  let status: PaceStatus = "unknown";
  if (typicalToDate !== null && avgFull !== null) {
    delta = spent - typicalToDate;
    pct = typicalToDate > 0 ? delta / typicalToDate : null;
    projected = spent + Math.max(0, avgFull - typicalToDate);
    const tolerance = Math.max(typicalToDate * 0.05, 10);
    status = Math.abs(delta) <= tolerance ? "even" : delta < 0 ? "under" : "over";
  }

  // 5. Benchmark.
  const bc = prefs.benchmark;
  let benchmarkValue: number | null = null;
  let benchmarkSource: BenchmarkMode | "none" = "none";
  if (bc.mode === "income") {
    if (incomeAvg !== null && incomeAvg > 0) {
      benchmarkValue = (incomeAvg * bc.incomePercent) / 100;
      benchmarkSource = "income";
    }
  } else if (bc.manualAmount > 0) {
    benchmarkValue = convertBenchmarkUnit(bc.manualAmount, bc.manualUnit, mode);
    benchmarkSource = "manual";
  }
  const remainingBudget = benchmarkValue !== null ? benchmarkValue - spent : null;
  const perDayRemaining =
    remainingBudget !== null && remainingDays > 0 ? remainingBudget / remainingDays : null;

  // 6. Previous period at the same point.
  let prevPeriod: CurrentSpendingResult["prevPeriod"] = null;
  {
    const prevStart = addPeriods(start, -1, mode);
    if (first && addPeriods(prevStart, 1, mode) > first) {
      const p = profile(prevStart);
      if (p.full > 0) {
        prevPeriod = { label: periodLabel(prevStart, mode), toDate: p.toDate, full: p.full };
      }
    }
  }

  // 7. Cumulative pace series.
  const pace: PaceRow[] = [];
  {
    let cum = 0;
    for (let i = 1; i <= totalDays; i++) {
      cum += current.daily[i - 1];
      let typical: number | null = null;
      if (nB) {
        let sum = 0;
        for (const p of baseline) {
          const upto = Math.min(i, p.len);
          let c = 0;
          for (let j = 0; j < upto; j++) c += p.daily[j];
          sum += c;
        }
        typical = sum / nB;
      }
      pace.push({
        day: i,
        label: mode === "week" ? WEEKDAYS_SHORT[i - 1] : String(i),
        current: i <= elapsedDays ? cum : null,
        typical,
      });
    }
  }

  // 8. Recent periods for the bar chart.
  const recent: RecentPeriod[] = [];
  {
    const count = mode === "week" ? 8 : 6;
    for (let j = count - 1; j >= 0; j--) {
      const pStart = addPeriods(start, -j, mode);
      const isCurrent = j === 0;
      if (!isCurrent && (!first || pStart < first)) continue;
      const p = isCurrent ? current : profile(pStart);
      const value = isCurrent ? spent : p.full;
      recent.push({
        key: toDayKey(pStart),
        label: periodShortLabel(pStart, mode),
        fullLabel: periodLabel(pStart, mode),
        spent: value,
        isCurrent,
        vsAvg: avgFull !== null ? value - avgFull : null,
      });
    }
  }

  // 9. Category comparison at the same point in the period.
  const categoryNames = new Set<string>([...current.catToDate.keys(), ...catTypical.keys()]);
  const categories: CategoryComparison[] = Array.from(categoryNames)
    .map((category) => {
      const cur = current.catToDate.get(category) ?? 0;
      const typical = nB ? catTypical.get(category) ?? 0 : null;
      const typicalFull = nB ? catTypicalFull.get(category) ?? 0 : null;
      const d = typical === null ? null : cur - typical;
      return {
        category,
        current: cur,
        typical,
        typicalFull,
        delta: d,
        pct: typical !== null && typical > 0 && d !== null ? d / typical : null,
      };
    })
    .filter((c) => c.current >= 1 || (c.typical ?? 0) >= 1)
    .sort((a, b) => Math.abs(b.delta ?? b.current) - Math.abs(a.delta ?? a.current));

  return {
    hasData,
    anchorDay: toDayKey(anchor),
    latestDay,
    lagDays,
    isStale,
    period: {
      key: toDayKey(start),
      label: periodLabel(start, mode),
      start: toDayKey(start),
      endInclusive: toDayKey(addDays(start, totalDays - 1)),
      totalDays,
      elapsedDays,
      remainingDays,
      isComplete: elapsedDays >= totalDays,
    },
    spent,
    typicalToDate,
    avgFull,
    projected,
    delta,
    pct,
    status,
    baseline: {
      periodsUsed: nB,
      requested,
      earliestStart: nB ? toDayKey(baseline[nB - 1].start) : null,
      latestEnd: nB ? toDayKey(addDays(addPeriods(baseline[0].start, 1, mode), -1)) : null,
    },
    benchmark: {
      value: benchmarkValue,
      source: benchmarkSource,
      incomeAvgPerPeriod: incomeAvg,
      percent: bc.incomePercent,
    },
    remainingBudget,
    perDayRemaining,
    prevPeriod,
    pace,
    recent,
    categories,
  };
}
