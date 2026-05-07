"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

export function PeriodSelector() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("period") ?? "all";

  function select(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete("period");
    else next.set("period", value);
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => select(p.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            current === p.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
