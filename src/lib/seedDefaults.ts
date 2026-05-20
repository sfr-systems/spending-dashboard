import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BUILTIN_SMART_CATEGORIES, BUILTIN_RECATEGORIZE_RULES } from "@/lib/builtinRules";

type Prefs = Prisma.JsonObject;

/**
 * Seed the user with the default Smart Categories and recategorize rules.
 * Idempotent: only creates missing rows. Returns true if any rows were created.
 *
 * Pass `backfillDerivedCategory: true` on the first seeding for a user to
 * reset transactions' `derivedCategory` to the source `category` — this
 * undoes any value the old hard-coded enricher wrote at parse time, so the
 * read-time rules become the single source of truth.
 */
export async function seedDefaultRules(
  userId: string,
  opts: { backfillDerivedCategory?: boolean } = {},
): Promise<{ createdCategories: number; createdRules: number; backfilled: number }> {
  let createdCategories = 0;
  let createdRules = 0;
  let backfilled = 0;

  for (const name of BUILTIN_SMART_CATEGORIES) {
    const existing = await db.smartCategory.findUnique({
      where: { userId_name: { userId, name } },
    });
    if (!existing) {
      await db.smartCategory.create({ data: { userId, name } });
      createdCategories++;
    }
  }

  for (const rule of BUILTIN_RECATEGORIZE_RULES) {
    const existing = await db.transactionRule.findFirst({
      where: {
        userId,
        type: "recategorize",
        matchField: rule.matchField,
        phrase: rule.phrase,
        targetCategory: rule.targetCategory,
      },
    });
    if (!existing) {
      await db.transactionRule.create({
        data: {
          userId,
          type: "recategorize",
          matchField: rule.matchField,
          phrase: rule.phrase,
          targetCategory: rule.targetCategory,
        },
      });
      createdRules++;
    }
  }

  if (opts.backfillDerivedCategory) {
    // Reset derivedCategory to the source category for all of this user's
    // transactions whose derivedCategory diverges. Rules will re-derive at
    // read time, so visible categorization is preserved while making
    // deletion of a default rule actually revert the value.
    const result = await db.$executeRaw`
      UPDATE "Transaction"
      SET "derivedCategory" = "category"
      WHERE "userId" = ${userId}
        AND "derivedCategory" <> "category"
    `;
    backfilled = typeof result === "number" ? result : 0;
  }

  return { createdCategories, createdRules, backfilled };
}

/** Run the initial seeding the first time a user lands on Edits. */
export async function ensureInitialSeed(userId: string): Promise<void> {
  const pref = await db.userPreference.findUnique({ where: { userId } });
  const data: Prefs = (pref?.data && typeof pref.data === "object" && !Array.isArray(pref.data)
    ? (pref.data as Prefs)
    : {});
  if (data.defaultsSeededAt) return;

  await seedDefaultRules(userId, { backfillDerivedCategory: true });

  const nextData: Prefs = { ...data, defaultsSeededAt: new Date().toISOString() };
  await db.userPreference.upsert({
    where: { userId },
    create: { userId, data: nextData },
    update: { data: nextData },
  });
}
