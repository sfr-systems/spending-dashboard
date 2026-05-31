import { toMonthKey } from "@/lib/dashboard";

export type InterestTxn = {
  transactionDate: Date;
  amount: number;
};

export type MonthlyInterest = {
  monthKey: string; // "YYYY-MM"
  label: string;    // "M/YY"
  total: number;    // positive dollars
};

export function monthKeyToLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${Number(m)}/${y.slice(2)}`;
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return toMonthKey(d);
}

/**
 * Group interest transactions by month and return a contiguous series from the
 * earliest charge through the latest of (last charge, current month).
 */
export function computeMonthlyInterest(txns: InterestTxn[]): MonthlyInterest[] {
  if (txns.length === 0) return [];

  const sums = new Map<string, number>();
  let minKey: string | null = null;
  let maxKey: string | null = null;

  for (const t of txns) {
    const key = toMonthKey(new Date(t.transactionDate));
    sums.set(key, (sums.get(key) ?? 0) + Math.abs(t.amount));
    if (!minKey || key < minKey) minKey = key;
    if (!maxKey || key > maxKey) maxKey = key;
  }

  if (!minKey || !maxKey) return [];
  const todayKey = toMonthKey(new Date());
  if (todayKey > maxKey) maxKey = todayKey;

  const out: MonthlyInterest[] = [];
  let cur = minKey;
  while (cur <= maxKey) {
    out.push({ monthKey: cur, label: monthKeyToLabel(cur), total: sums.get(cur) ?? 0 });
    cur = addMonths(cur, 1);
  }
  return out;
}

/**
 * Average across months that actually contain charges. Returns 0 when none.
 */
export function computeAverageMonthlyInterest(monthly: MonthlyInterest[]): number {
  const withCharges = monthly.filter((m) => m.total > 0);
  if (withCharges.length === 0) return 0;
  const total = withCharges.reduce((s, m) => s + m.total, 0);
  return total / withCharges.length;
}
