"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export function TransferOutToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Default ON (transfers excluded): only off when explicitly set to "0"
  const excludeTransferOut = searchParams.get("xferout") !== "0";

  const toggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (excludeTransferOut) {
      params.set("xferout", "0");
    } else {
      params.delete("xferout");
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }, [router, pathname, searchParams, excludeTransferOut]);

  return (
    <button
      onClick={toggle}
      aria-pressed={excludeTransferOut}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
        excludeTransferOut
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          excludeTransferOut ? "bg-amber-500" : "bg-muted-foreground/50"
        }`}
      />
      Exclude Transfers Out
    </button>
  );
}
