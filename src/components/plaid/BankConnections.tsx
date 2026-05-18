"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banknote, Link2, RefreshCw, Trash2 } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

type PlaidAccountInfo = { id: string; name: string; mask: string | null; subtype: string | null };
type PlaidItemRow = {
  id: string;
  institutionName: string;
  status: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  accounts: PlaidAccountInfo[];
};

export function BankConnections({ mfaEnabled }: { mfaEnabled: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<PlaidItemRow[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/plaid/items");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      setError(null);
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ publicToken }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to connect bank");
        }
        const data = await res.json();
        setInfo(`Connected ${data.institutionName}. Running first sync…`);
        await fetch("/api/plaid/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId: data.id }),
        });
        setInfo(`Connected ${data.institutionName} and pulled transactions.`);
        await loadItems();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to connect bank");
      } finally {
        setLinkToken(null);
      }
    },
    [loadItems, router]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => {
      void onPlaidSuccess(publicToken);
    },
    onExit: () => {
      setLinkToken(null);
    },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const startConnect = useCallback(async () => {
    setError(null);
    setInfo(null);
    setCreatingToken(true);
    try {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start bank connection");
      }
      const data = await res.json();
      setLinkToken(data.linkToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start bank connection");
    } finally {
      setCreatingToken(false);
    }
  }, []);

  const sync = useCallback(
    async (itemId: string) => {
      setBusyItemId(itemId);
      setError(null);
      setInfo(null);
      try {
        const res = await fetch("/api/plaid/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Sync failed");
        }
        const data = await res.json();
        const s = data.summaries?.[0];
        setInfo(
          s
            ? `Synced: ${s.added} added, ${s.modified} updated, ${s.removed} removed.`
            : "Synced."
        );
        await loadItems();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sync failed");
      } finally {
        setBusyItemId(null);
      }
    },
    [loadItems, router]
  );

  const disconnect = useCallback(
    async (itemId: string, name: string) => {
      if (!confirm(`Disconnect ${name}? Transactions already imported will remain, but no new ones will be pulled.`)) {
        return;
      }
      setBusyItemId(itemId);
      setError(null);
      try {
        const res = await fetch(`/api/plaid/items/${itemId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Disconnect failed");
        }
        setInfo(`Disconnected ${name}.`);
        await loadItems();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Disconnect failed");
      } finally {
        setBusyItemId(null);
      }
    },
    [loadItems, router]
  );

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-medium">Connected banks</h2>
        </div>
        <Button onClick={startConnect} disabled={creatingToken || !mfaEnabled} size="sm">
          <Link2 className="mr-2 h-4 w-4" />
          {creatingToken ? "Opening…" : "Connect a bank"}
        </Button>
      </div>

      {!mfaEnabled && (
        <p className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Must have two factor authentication enabled to connect to a bank
        </p>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        Read-only connection via Plaid. We never see your bank password. By connecting, you agree
        to our{" "}
        <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
          privacy policy
        </Link>
        .
      </p>

      {error && (
        <p className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {info && !error && (
        <p className="mt-3 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {info}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-4 py-4 text-center text-sm text-muted-foreground">
          No banks connected yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.institutionName}</span>
                  {item.status === "error" ? (
                    <Badge variant="destructive">Error</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.accounts.length} account{item.accounts.length === 1 ? "" : "s"}
                  {" • "}
                  {item.lastSyncedAt
                    ? `Last synced ${formatDate(new Date(item.lastSyncedAt))}`
                    : "Not yet synced"}
                </p>
                {item.lastSyncError && (
                  <p className="mt-1 text-xs text-destructive">{item.lastSyncError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sync(item.id)}
                  disabled={busyItemId === item.id}
                >
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${busyItemId === item.id ? "animate-spin" : ""}`} />
                  Sync
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnect(item.id, item.institutionName)}
                  disabled={busyItemId === item.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
