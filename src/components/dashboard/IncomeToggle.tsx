"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export function IncomeToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const includeIncome = searchParams.get("income") === "1";

  const toggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (includeIncome) {
      params.delete("income");
    } else {
      params.set("income", "1");
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }, [router, pathname, searchParams, includeIncome]);

  return (
    <button
      onClick={toggle}
      aria-pressed={includeIncome}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
        includeIncome
          ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          includeIncome ? "bg-green-500" : "bg-muted-foreground/50"
        }`}
      />
      {includeIncome ? "Income included" : "Income excluded"}
    </button>
  );
}
