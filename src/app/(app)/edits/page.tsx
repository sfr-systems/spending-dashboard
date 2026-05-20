import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { EditsClient } from "@/components/edits/EditsClient";
import { getUserRules } from "@/lib/rules";
import { ensureInitialSeed } from "@/lib/seedDefaults";

export const metadata = { title: "Edits — SpendWise" };

export default async function EditsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // First-visit seeding of the default Smart Categories and rules.
  // Idempotent — reads/writes a flag in UserPreference.data.
  await ensureInitialSeed(userId);

  const [smartCategories, rules, derivedRows] = await Promise.all([
    db.smartCategory.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getUserRules(userId),
    db.transaction.findMany({
      where: { userId, NOT: { file: { frozen: true } } },
      select: { derivedCategory: true },
      distinct: ["derivedCategory"],
    }),
  ]);

  const existingCategories = Array.from(
    new Set(derivedRows.map((r) => r.derivedCategory).filter((s) => s && s.trim() !== "")),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reshape your data: define Smart Categories, recategorize transactions by phrase, or
          exclude transactions you don&apos;t want to see.
        </p>
      </div>
      <EditsClient
        initialCategories={smartCategories}
        initialRules={rules}
        existingCategoryNames={existingCategories}
      />
    </div>
  );
}
