"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export function CleanedDataToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Default ON: only off when explicitly set to "0"
  const cleanedData = searchParams.get("cleaned") !== "0";

  const toggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (cleanedData) {
      params.set("cleaned", "0");
    } else {
      params.delete("cleaned");
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }, [router, pathname, searchParams, cleanedData]);

  return (
    <button
      onClick={toggle}
      aria-pressed={cleanedData}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
        cleanedData
          ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          cleanedData ? "bg-blue-500" : "bg-muted-foreground/50"
        }`}
      />
      Cleaned Data
    </button>
  );
}
