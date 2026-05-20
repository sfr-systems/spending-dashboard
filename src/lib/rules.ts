import { db } from "@/lib/db";

export type RuleType = "recategorize" | "exclude" | "rename";
export type RuleMatchField = "description" | "cleanedDescription" | "any";

export type TransactionRuleRow = {
  id: string;
  type: RuleType;
  matchField: RuleMatchField;
  phrase: string;
  targetCategory: string | null;
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

/**
 * Drop excluded transactions, apply recategorize rules to derivedCategory,
 * and apply rename rules to cleanedDescription. Last matching rule of each
 * mutating type wins.
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

    const derived = recatMatches.length > 0
      ? recatMatches[recatMatches.length - 1].targetCategory!
      : t.derivedCategory;
    const cleaned = renameMatches.length > 0
      ? renameMatches[renameMatches.length - 1].targetCategory!
      : t.cleanedDescription;

    if (derived === t.derivedCategory && cleaned === t.cleanedDescription) {
      result.push(t);
    } else {
      result.push({ ...t, derivedCategory: derived, cleanedDescription: cleaned });
    }
  }
  return result;
}

export async function getUserRules(userId: string): Promise<TransactionRuleRow[]> {
  const rows = await db.transactionRule.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type as RuleType,
    matchField: r.matchField as RuleMatchField,
    phrase: r.phrase,
    targetCategory: r.targetCategory,
    createdAt: r.createdAt.toISOString(),
  }));
}
