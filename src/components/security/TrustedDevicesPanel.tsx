"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { TRUSTED_DEVICE_DAYS } from "@/lib/mfa/trustedDeviceConstants";

type Device = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
};

export function TrustedDevicesPanel() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/mfa/trusted-devices");
    if (res.ok) {
      const data = (await res.json()) as { devices: Device[] };
      setDevices(data.devices);
    } else {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const forget = async (id?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(id ? `/api/mfa/trusted-devices/${id}` : "/api/mfa/trusted-devices", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't forget device");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't forget device");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-base font-medium">Remembered devices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browsers where you ticked &ldquo;Remember this device&rdquo; skip the authentication
            code for {TRUSTED_DEVICE_DAYS} days. Forget any you no longer use.
          </p>

          {devices === null ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : devices.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No remembered devices yet. Tick the box the next time you enter a code at sign-in.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-md border border-border">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{d.label ?? "Unknown device"}</span>
                      {d.current && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          This browser
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Added {formatDate(d.createdAt)} · last used {formatDate(d.lastUsedAt)} ·
                      expires {formatDate(d.expiresAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => forget(d.id)}
                    disabled={busy}
                    aria-label={`Forget ${d.label ?? "device"}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {devices && devices.length > 0 && (
            <Button variant="outline" className="mt-4" onClick={() => forget()} disabled={busy}>
              Forget all devices
            </Button>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
