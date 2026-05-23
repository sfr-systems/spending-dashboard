import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { HiddenEditsClient } from "@/components/edits/HiddenEditsClient";
import { getUserRules } from "@/lib/rules";

export const metadata = { title: "Hidden Edits — SpendWise" };

export default async function HiddenEditsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [smartCategories, rules, derivedRows] = await Promise.all([
    db.smartCategory.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getUserRules(userId, { hidden: true }),
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
        <h1 className="text-2xl font-semibold tracking-tight">Hidden Edits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reshape your data: recategorize transactions by phrase, rename Cleaned Names, or
          exclude transactions you don&apos;t want to see.
        </p>
      </div>
      <HiddenEditsClient
        availableCategories={smartCategories.map((c) => c.name)}
        initialRules={rules}
        existingCategoryNames={existingCategories}
      />
    </div>
  );
}
