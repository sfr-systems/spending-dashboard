import { db } from "@/lib/db";

export type RuleType = "recategorize" | "exclude" | "rename";
export type RuleMatchField = "description" | "cleanedDescription" | "any";

export type TransactionRuleRow = {
  id: string;
  type: RuleType;
  matchField: RuleMatchField;
  phrase: string;
  targetCategory: string | null;
  hidden: boolean;
  createdAt: string;
};

export type RuleApplicable = {
  description: string;
  cleanedDescription: string;
  derivedCategory: string;
};

function fieldText<T extends RuleApplicable>(t: T, field: RuleMatchField): string {
  if (field === "description") return t.description;
  if (field === "cleanedDescription") return t.cleanedDescription;
  return `${t.description}\n${t.cleanedDescription}`;
}

function ruleMatches<T extends RuleApplicable>(t: T, rule: TransactionRuleRow): boolean {
  const haystack = fieldText(t, rule.matchField).toLowerCase();
  return haystack.includes(rule.phrase.toLowerCase());
}

// Among rules that all match a transaction, the one with the longest phrase
// is the most specific (e.g. "uber eats" beats "uber"). Ties on length fall
// back to creation order so the most recently added rule still wins.
function pickMostSpecific(matches: TransactionRuleRow[]): TransactionRuleRow | null {
  if (matches.length === 0) return null;
  let best = matches[0];
  for (let i = 1; i < matches.length; i++) {
    const m = matches[i];
    if (m.phrase.length > best.phrase.length) best = m;
  }
  return best;
}

/**
 * Drop excluded transactions, apply recategorize rules to derivedCategory,
 * and apply rename rules to cleanedDescription. When multiple rules match a
 * transaction, the rule with the longest phrase wins (most specific), so a
 * narrower rule like "uber eats" beats a broader one like "uber".
 */
export function applyTransactionRules<T extends RuleApplicable>(
  transactions: T[],
  rules: TransactionRuleRow[],
): T[] {
  if (rules.length === 0) return transactions;
  const excludes = rules.filter((r) => r.type === "exclude");
  const recats = rules.filter((r) => r.type === "recategorize" && r.targetCategory);
  const renames = rules.filter((r) => r.type === "rename" && r.targetCategory);

  const result: T[] = [];
  for (const t of transactions) {
    // Rename rules match against the original (incoming) values, so the
    // overrides they compute against don't drift if multiple rules match.
    const renameMatches = renames.filter((r) => ruleMatches(t, r));
    const recatMatches = recats.filter((r) => ruleMatches(t, r));

    if (excludes.some((r) => ruleMatches(t, r))) continue;

    const recatWinner = pickMostSpecific(recatMatches);
    const renameWinner = pickMostSpecific(renameMatches);
    const derived = recatWinner ? recatWinner.targetCategory! : t.derivedCategory;
    const cleaned = renameWinner ? renameWinner.targetCategory! : t.cleanedDescription;

    if (derived === t.derivedCategory && cleaned === t.cleanedDescription) {
      result.push(t);
    } else {
      result.push({ ...t, derivedCategory: derived, cleanedDescription: cleaned });
    }
  }
  return result;
}

export async function getUserRules(
  userId: string,
  opts: { hidden?: boolean } = {},
): Promise<TransactionRuleRow[]> {
  const where: { userId: string; hidden?: boolean } = { userId };
  if (opts.hidden !== undefined) where.hidden = opts.hidden;
  const rows = await db.transactionRule.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type as RuleType,
    matchField: r.matchField as RuleMatchField,
    phrase: r.phrase,
    targetCategory: r.targetCategory,
    hidden: r.hidden,
    createdAt: r.createdAt.toISOString(),
  }));
}
