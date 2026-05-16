"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

type Status = {
  enabled: boolean;
  enabledAt: string | null;
  unusedBackupCodes: number;
};

type SetupData = {
  manualKey: string;
  qrCodeDataUrl: string;
};

export function SecuritySettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/mfa/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startEnrollment = useCallback(async () => {
    setBusy(true);
    setEnrollError(null);
    try {
      const res = await fetch("/api/mfa/setup", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start enrollment");
      }
      setSetupData(await res.json());
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : "Failed to start enrollment");
    } finally {
      setBusy(false);
    }
  }, []);

  const confirmEnrollment = useCallback(async () => {
    if (!enrollCode.trim()) return;
    setBusy(true);
    setEnrollError(null);
    try {
      const res = await fetch("/api/mfa/enable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: enrollCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't enable MFA");
      setBackupCodes(data.backupCodes);
      setSetupData(null);
      setEnrollCode("");
      await loadStatus();
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : "Couldn't enable MFA");
    } finally {
      setBusy(false);
    }
  }, [enrollCode, loadStatus]);

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  // After successful enable/regenerate, show backup codes once.
  if (backupCodes) {
    return <BackupCodesPanel codes={backupCodes} onDone={() => setBackupCodes(null)} />;
  }

  // Enrollment in progress (setupData present, MFA not yet enabled).
  if (setupData && !status.enabled) {
    return (
      <EnrollmentPanel
        setupData={setupData}
        code={enrollCode}
        setCode={setEnrollCode}
        onSubmit={confirmEnrollment}
        onCancel={() => {
          setSetupData(null);
          setEnrollCode("");
          setEnrollError(null);
        }}
        busy={busy}
        error={enrollError}
      />
    );
  }

  // Enrolled state.
  if (status.enabled) {
    return (
      <>
        <EnrolledPanel
          enabledAt={status.enabledAt}
          unusedBackupCodes={status.unusedBackupCodes}
          onDisable={() => setDisableOpen(true)}
          onRegenerate={() => setRegenOpen(true)}
        />
        {disableOpen && (
          <PasswordAndCodeDialog
            title="Disable two-factor authentication"
            description="Confirm your password and a current authentication code to turn off MFA."
            submitLabel="Disable MFA"
            destructive
            onClose={() => setDisableOpen(false)}
            onSubmit={async (password, code) => {
              const res = await fetch("/api/mfa/disable", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password, code }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) return data.error ?? "Couldn't disable MFA";
              setDisableOpen(false);
              await loadStatus();
              return null;
            }}
          />
        )}
        {regenOpen && (
          <PasswordAndCodeDialog
            title="Regenerate backup codes"
            description="Confirm your password and a current authentication code. Old backup codes will stop working immediately."
            submitLabel="Generate new codes"
            onClose={() => setRegenOpen(false)}
            onSubmit={async (password, code) => {
              const res = await fetch("/api/mfa/regenerate-backup-codes", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password, code }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) return data.error ?? "Couldn't regenerate codes";
              setRegenOpen(false);
              setBackupCodes(data.backupCodes);
              await loadStatus();
              return null;
            }}
          />
        )}
      </>
    );
  }

  // Not enrolled, not enrolling.
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-base font-medium">Two-factor authentication</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an extra step to sign-in. After your password, you&apos;ll enter a 6-digit code from
            an authenticator app like Google Authenticator, Authy, or 1Password.
          </p>
          <Button onClick={startEnrollment} disabled={busy} className="mt-4">
            {busy ? "Setting up…" : "Set up two-factor authentication"}
          </Button>
          {enrollError && (
            <p className="mt-3 text-sm text-destructive">{enrollError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EnrollmentPanel({
  setupData,
  code,
  setCode,
  onSubmit,
  onCancel,
  busy,
  error,
}: {
  setupData: SetupData;
  code: string;
  setCode: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="text-base font-medium">Set up two-factor authentication</h2>
      <ol className="mt-3 space-y-4 text-sm">
        <li>
          <p className="font-medium">1. Scan this QR code with an authenticator app.</p>
          <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row">
            <img
              src={setupData.qrCodeDataUrl}
              alt="MFA QR code"
              className="rounded-md border border-border bg-white p-2"
              width={200}
              height={200}
            />
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Or enter this key manually if you can&apos;t scan it:
              </p>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                  {setupData.manualKey}
                </code>
                <CopyButton text={setupData.manualKey} />
              </div>
            </div>
          </div>
        </li>
        <li>
          <p className="font-medium">2. Enter the 6-digit code to confirm.</p>
          <div className="mt-2 space-y-1.5">
            <Label htmlFor="enrollCode" className="sr-only">
              Authentication code
            </Label>
            <Input
              id="enrollCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="max-w-[160px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
          </div>
        </li>
      </ol>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-5 flex gap-2">
        <Button onClick={onSubmit} disabled={busy || code.trim().length === 0}>
          {busy ? "Verifying…" : "Verify and enable"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function EnrolledPanel({
  enabledAt,
  unusedBackupCodes,
  onDisable,
  onRegenerate,
}: {
  enabledAt: string | null;
  unusedBackupCodes: number;
  onDisable: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium">Two-factor authentication</h2>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Enabled {enabledAt ? formatDate(new Date(enabledAt)) : ""}.{" "}
            {unusedBackupCodes} unused backup code{unusedBackupCodes === 1 ? "" : "s"} remaining.
          </p>
          {unusedBackupCodes <= 2 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
              <ShieldAlert className="h-3.5 w-3.5" />
              Running low on backup codes — regenerate to refresh the set.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={onRegenerate}>
              <KeyRound className="mr-2 h-4 w-4" />
              Regenerate backup codes
            </Button>
            <Button variant="ghost" onClick={onDisable}>
              Disable MFA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackupCodesPanel({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const allCodes = codes.join("\n");
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div className="flex-1">
          <h2 className="text-base font-medium">Save your backup codes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each code can be used once if you lose access to your authenticator app. Store them
            somewhere safe — they won&apos;t be shown again.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2">
            {codes.map((c) => (
              <code
                key={c}
                className="rounded border border-border bg-muted/50 px-3 py-2 text-center font-mono text-sm"
              >
                {c}
              </code>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <CopyButton text={allCodes} label="Copy all" />
            <Button onClick={onDone}>I&apos;ve saved them</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size={label ? "default" : "icon"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      aria-label={label ?? "Copy"}
      className={label ? "" : "h-8 w-8"}
    >
      <Copy className={`${label ? "mr-2 " : ""}h-3.5 w-3.5`} />
      {label && (copied ? "Copied" : label)}
    </Button>
  );
}

function PasswordAndCodeDialog({
  title,
  description,
  submitLabel,
  destructive,
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  submitLabel: string;
  destructive?: boolean;
  onClose: () => void;
  onSubmit: (password: string, code: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onSubmit(password, code);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border bg-card p-5 shadow-xl"
      >
        <h3 className="text-base font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dlgPassword">Password</Label>
            <Input
              id="dlgPassword"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dlgCode">Authentication code</Label>
            <Input
              id="dlgCode"
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456 or backup code"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || !password || !code}
            className={destructive ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
          >
            {busy ? "…" : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
