export type RecurringInput = {
  id: string;
  transactionDate: string;
  cleanedDescription: string;
  amount: number;
};

const MIN_DISTINCT_MONTHS = 3;

function groupKey(t: RecurringInput): string | null {
  const name = t.cleanedDescription.trim().toLowerCase();
  if (!name) return null;
  // Bucket amounts to the nearest dollar so small price changes (e.g.
  // $9.95 vs $9.99) still group together, but a $5 charge and a $50
  // charge at the same merchant stay separate.
  const bucket = Math.round(Math.abs(t.amount));
  return `${name}|${bucket}`;
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

/**
 * Identify transactions that look like recurring monthly charges:
 * same cleaned description + similar amount appearing in
 * MIN_DISTINCT_MONTHS or more distinct calendar months.
 */
export function detectRecurringIds<T extends RecurringInput>(transactions: T[]): Set<string> {
  const groups = new Map<string, { ids: string[]; months: Set<string> }>();

  for (const t of transactions) {
    const key = groupKey(t);
    if (!key) continue;
    let group = groups.get(key);
    if (!group) {
      group = { ids: [], months: new Set() };
      groups.set(key, group);
    }
    group.ids.push(t.id);
    group.months.add(monthKey(t.transactionDate));
  }

  const recurring = new Set<string>();
  for (const group of groups.values()) {
    if (group.months.size >= MIN_DISTINCT_MONTHS) {
      for (const id of group.ids) recurring.add(id);
    }
  }
  return recurring;
}
