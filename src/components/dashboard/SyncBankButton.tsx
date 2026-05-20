"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

interface SyncBankButtonProps {
  lastSyncedAt: string | null;
}

export function SyncBankButton({ lastSyncedAt }: SyncBankButtonProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSync() {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Sync failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">
        {error
          ? <span className="text-destructive">{error}</span>
          : lastSyncedAt
          ? `Last synced ${formatDate(new Date(lastSyncedAt))}`
          : "Not yet synced"}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={syncing}
        className="h-7 px-2.5"
      >
        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Sync"}
      </Button>
    </div>
  );
}
