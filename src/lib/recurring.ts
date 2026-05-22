export type RecurringInput = {
  id: string;
  transactionDate: string;
  cleanedDescription: string;
  amount: number;
};

const MIN_RUN_LENGTH = 3;
const MIN_GAP_DAYS = 20;
const MAX_GAP_DAYS = 40;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function groupKey(t: RecurringInput): string | null {
  const name = t.cleanedDescription.trim().toLowerCase();
  if (!name) return null;
  // Exact amount match (rounded to cents to avoid float noise).
  const cents = Math.round(t.amount * 100);
  return `${name}|${cents}`;
}

/**
 * Identify transactions that look like recurring monthly charges:
 * same cleaned description and exact amount, occurring in a run of at
 * least MIN_RUN_LENGTH transactions whose consecutive gaps are all
 * within MIN_GAP_DAYS..MAX_GAP_DAYS (~one month apart).
 *
 * Only the transactions inside the qualifying run are flagged; strays
 * at the same merchant + amount that fall outside the monthly cadence
 * are not.
 */
export function detectRecurringIds<T extends RecurringInput>(transactions: T[]): Set<string> {
  const groups = new Map<string, { id: string; ms: number }[]>();

  for (const t of transactions) {
    const key = groupKey(t);
    if (!key) continue;
    let g = groups.get(key);
    if (!g) {
      g = [];
      groups.set(key, g);
    }
    g.push({ id: t.id, ms: new Date(t.transactionDate).getTime() });
  }

  const recurring = new Set<string>();
  for (const entries of groups.values()) {
    if (entries.length < MIN_RUN_LENGTH) continue;
    entries.sort((a, b) => a.ms - b.ms);

    let run: typeof entries = [entries[0]];
    for (let i = 1; i < entries.length; i++) {
      const gapDays = (entries[i].ms - entries[i - 1].ms) / MS_PER_DAY;
      if (gapDays >= MIN_GAP_DAYS && gapDays <= MAX_GAP_DAYS) {
        run.push(entries[i]);
      } else {
        if (run.length >= MIN_RUN_LENGTH) {
          for (const r of run) recurring.add(r.id);
        }
        run = [entries[i]];
      }
    }
    if (run.length >= MIN_RUN_LENGTH) {
      for (const r of run) recurring.add(r.id);
    }
  }
  return recurring;
}
