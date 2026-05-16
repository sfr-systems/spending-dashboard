export interface TransactionForDashboard {
  transactionDate: Date;
  amount: number; // already converted from Prisma Decimal
  category: string;
  transactionType: string;
}

export interface DashboardSummary {
  totalSpent: number;
  totalIncome: number;
  net: number;
  transactionCount: number;
}

export interface CategoryTotal {
  category: string;
  total: number; // positive, represents spend
}

export interface MonthlyTotal {
  month: string; // "Jan 2024"
  spent: number; // positive number
  income: number; // positive number
}

export function computeSummary(txns: TransactionForDashboard[]): DashboardSummary {
  let totalSpent = 0;
  let totalIncome = 0;
  for (const t of txns) {
    if (t.amount < 0) totalSpent += Math.abs(t.amount);
    else if (t.amount > 0) totalIncome += t.amount;
  }
  return {
    totalSpent,
    totalIncome,
    net: totalIncome - totalSpent,
    transactionCount: txns.length,
  };
}

export function computeByCategory(txns: TransactionForDashboard[]): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (t.amount >= 0) continue; // skip income
    const cat = t.category || "Uncategorized";
    map.set(cat, (map.get(cat) ?? 0) + Math.abs(t.amount));
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function computeByMonth(txns: TransactionForDashboard[]): MonthlyTotal[] {
  const map = new Map<string, { spent: number; income: number }>();

  for (const t of txns) {
    const d = new Date(t.transactionDate);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    if (!map.has(key)) map.set(key, { spent: 0, income: 0 });
    const entry = map.get(key)!;
    if (t.amount < 0) entry.spent += Math.abs(t.amount);
    else if (t.amount > 0) entry.income += t.amount;
    // Store label alongside key — rebuild below
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { spent, income }]) => {
      const [year, month] = key.split("-");
      const label = `${MONTH_LABELS[+month - 1]} ${year}`;
      return { month: label, spent, income };
    });
}

export interface StackedPeriod {
  period: string;
  [key: string]: number | string;
}

export interface StackedSpendingData {
  periods: StackedPeriod[];
  categories: string[];
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

function buildStackedData(
  periodMap: Map<string, Map<string, number>>,
  incomeMap: Map<string, number>,
  allCategories: Set<string>,
  includeIncome: boolean,
  labelFn: (key: string) => string,
  fillGaps = false,
  boundStart?: string,
  boundEnd?: string
): StackedSpendingData {
  const allKeys = new Set([
    ...Array.from(periodMap.keys()),
    ...(includeIncome ? Array.from(incomeMap.keys()) : []),
  ]);
  const sortedKeys = fillGaps
    ? fillMonthGaps(Array.from(allKeys), boundStart, boundEnd)
    : Array.from(allKeys).sort();
  const categoriesArr = Array.from(allCategories);

  const periods: StackedPeriod[] = sortedKeys.map((key) => {
    const catMap = periodMap.get(key) ?? new Map<string, number>();
    const entry: StackedPeriod = { period: labelFn(key) };
    for (const cat of categoriesArr) entry[cat] = catMap.get(cat) ?? 0;
    if (includeIncome) entry["Income"] = incomeMap.get(key) ?? 0;
    return entry;
  });

  const categories = Array.from(allCategories)
    .map((cat) => ({
      cat,
      total: periods.reduce((s, p) => s + (Number(p[cat]) || 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .map((c) => c.cat);

  return { periods, categories };
}

export const toMonthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export function computeStackedByMonth(
  txns: TransactionForDashboard[],
  includeIncome: boolean,
  since?: Date | null,
  until?: Date | null
): StackedSpendingData {
  const periodMap = new Map<string, Map<string, number>>();
  const incomeMap = new Map<string, number>();
  const allCategories = new Set<string>();

  for (const t of txns) {
    const d = new Date(t.transactionDate);
    const key = toMonthKey(d);
    if (t.amount > 0) {
      if (includeIncome) incomeMap.set(key, (incomeMap.get(key) ?? 0) + t.amount);
      continue;
    }
    const cat = t.category || "Uncategorized";
    allCategories.add(cat);
    if (!periodMap.has(key)) periodMap.set(key, new Map());
    periodMap.get(key)!.set(cat, (periodMap.get(key)!.get(cat) ?? 0) + Math.abs(t.amount));
  }

  // Extend the rendered range to cover the full selected period, not just months with data.
  const boundStart = since ? toMonthKey(since) : undefined;
  const boundEnd = until ? toMonthKey(until) : (since ? toMonthKey(new Date()) : undefined);

  return buildStackedData(periodMap, incomeMap, allCategories, includeIncome, (key) => {
    const [year, month] = key.split("-");
    return `${+month}/${year.slice(2)}`;
  }, true, boundStart, boundEnd);
}

export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function computeStackedByWeek(
  txns: TransactionForDashboard[],
  includeIncome: boolean
): StackedSpendingData {
  const periodMap = new Map<string, Map<string, number>>();
  const incomeMap = new Map<string, number>();
  const allCategories = new Set<string>();

  for (const t of txns) {
    const key = getISOWeekKey(new Date(t.transactionDate));
    if (t.amount > 0) {
      if (includeIncome) incomeMap.set(key, (incomeMap.get(key) ?? 0) + t.amount);
      continue;
    }
    const cat = t.category || "Uncategorized";
    allCategories.add(cat);
    if (!periodMap.has(key)) periodMap.set(key, new Map());
    periodMap.get(key)!.set(cat, (periodMap.get(key)!.get(cat) ?? 0) + Math.abs(t.amount));
  }

  return buildStackedData(periodMap, incomeMap, allCategories, includeIncome, (key) => {
    const [yr, wk] = key.split("-W");
    return `W${+wk}/${yr.slice(2)}`;
  });
}

/** Returns a Date representing the start of the requested period (UTC midnight). */
export function periodStart(period: string): Date | null {
  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "30d") {
    return new Date(utcToday.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (period === "3m") {
    return new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth() - 3, 1));
  }
  if (period === "6m") {
    return new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth() - 6, 1));
  }
  if (period === "1y") {
    return new Date(Date.UTC(utcToday.getUTCFullYear() - 1, utcToday.getUTCMonth(), 1));
  }
  return null; // "all"
}
