/**
 * One-time backfill: populates cleanedDescription and derivedCategory for
 * transactions that were created before those fields were added.
 */
import { PrismaClient } from "@prisma/client";
import { buildCleanedDescription, buildDerivedCategory } from "../src/lib/csv/enrich";

const db = new PrismaClient();
const BATCH_SIZE = 200;

async function main() {
  const total = await db.transaction.count({ where: { cleanedDescription: "" } });
  console.log(`Found ${total} transactions to backfill.`);
  if (total === 0) {
    console.log("Nothing to do.");
    return;
  }

  let processed = 0;
  const seen = new Set<string>();

  while (true) {
    const batch = await db.transaction.findMany({
      where: { cleanedDescription: "" },
      select: { id: true, description: true, category: true },
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
    });

    if (batch.length === 0) break;

    // Safety: if every id in this batch was already processed, we'd loop forever.
    const newIds = batch.filter((t) => !seen.has(t.id));
    if (newIds.length === 0) {
      console.warn("Warning: remaining records can't be enriched to a non-empty value, skipping.");
      break;
    }
    newIds.forEach((t) => seen.add(t.id));

    await Promise.all(
      batch.map((t) =>
        db.transaction.update({
          where: { id: t.id },
          data: {
            cleanedDescription: buildCleanedDescription(t.description),
            derivedCategory: buildDerivedCategory(t.description, t.category),
          },
        })
      )
    );

    processed += batch.length;
    console.log(`  ${processed}/${total} updated`);
  }

  console.log("Backfill complete.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
