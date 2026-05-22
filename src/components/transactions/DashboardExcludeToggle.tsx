"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  transactionId: string;
  initialExcluded: boolean;
}

export function DashboardExcludeToggle({ transactionId, initialExcluded }: Props) {
  const router = useRouter();
  const [excluded, setExcluded] = useState(initialExcluded);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  async function toggle() {
    const next = !excluded;
    setExcluded(next); // optimistic
    setError(false);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludedFromDashboard: next }),
      });
      if (!res.ok) throw new Error("Request failed");
      startTransition(() => router.refresh());
    } catch {
      setExcluded(!next); // revert
      setError(true);
    }
  }

  const included = !excluded;
  const Icon = included ? Eye : EyeOff;
  const label = included ? "Included in dashboard" : "Excluded from dashboard";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={included}
      aria-label={label}
      title={error ? "Failed — try again" : label}
      className={
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors " +
        (included
          ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted") +
        (isPending ? " opacity-60" : "") +
        (error ? " border-destructive text-destructive" : "")
      }
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{included ? "Included" : "Excluded"}</span>
    </button>
  );
}
