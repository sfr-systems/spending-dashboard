"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AlertTriangle, Mail, Key, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";

export function SettingsForm({
  email,
  mfaEnabled,
  createdAt,
}: {
  email: string;
  mfaEnabled: boolean;
  createdAt: string;
}) {
  return (
    <div className="space-y-6">
      <AccountInfoCard email={email} mfaEnabled={mfaEnabled} createdAt={createdAt} />
      <ChangeEmailCard currentEmail={email} />
      <ChangePasswordCard />
      <DeleteAccountCard mfaEnabled={mfaEnabled} />
    </div>
  );
}

function AccountInfoCard({
  email,
  mfaEnabled,
  createdAt,
}: {
  email: string;
  mfaEnabled: boolean;
  createdAt: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <User className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-base font-medium">Account</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="truncate">{email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Member since</dt>
              <dd>{formatDate(new Date(createdAt))}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Two-factor auth</dt>
              <dd>{mfaEnabled ? "Enabled" : "Not enabled"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setError("That's already your current email.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newEmail: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't update email");
      setSuccess(`Email updated to ${newEmail.trim().toLowerCase()}.`);
      setNewEmail("");
      setCurrentPassword("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-base font-medium">Change email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ll use this email to sign in going forward.
          </p>
          <form onSubmit={onSubmit} className="mt-4 space-y-3 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="newEmail">New email</Label>
              <Input
                id="newEmail"
                type="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emailCurrentPassword">Current password</Label>
              <Input
                id="emailCurrentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
            <Button type="submit" disabled={busy || !newEmail || !currentPassword}>
              {busy ? "Updating…" : "Update email"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't update password");
      setSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <Key className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-base font-medium">Change password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password you don&apos;t use anywhere else.
          </p>
          <form onSubmit={onSubmit} className="mt-4 space-y-3 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="pwCurrent">Current password</Label>
              <Input
                id="pwCurrent"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwNew">New password</Label>
              <Input
                id="pwNew"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwConfirm">Confirm new password</Label>
              <Input
                id="pwConfirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
            <Button type="submit" disabled={busy || !currentPassword || !newPassword || !confirmPassword}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function DeleteAccountCard({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (confirmText !== "DELETE") {
      setError('Type DELETE to confirm.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, ...(mfaEnabled ? { mfaCode } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't delete account");
      // Sign out and bounce to login (with no callback URL — they have no account anymore)
      await signOut({ callbackUrl: "/login" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete account");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/[0.03] p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="flex-1">
          <h2 className="text-base font-medium text-destructive">Delete account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete your account, all uploaded files, all parsed transactions, all
            connected bank accounts, and all settings. Connected banks are also disconnected from
            Plaid. This cannot be undone.
          </p>

          {!open ? (
            <Button
              variant="outline"
              onClick={() => setOpen(true)}
              className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Delete account…
            </Button>
          ) : (
            <form onSubmit={onSubmit} className="mt-4 space-y-3 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="delPassword">Password</Label>
                <Input
                  id="delPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {mfaEnabled && (
                <div className="space-y-1.5">
                  <Label htmlFor="delMfaCode">Authentication code</Label>
                  <Input
                    id="delMfaCode"
                    type="text"
                    inputMode="text"
                    autoComplete="one-time-code"
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="6-digit code or backup code"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="delConfirm">
                  Type <code className="rounded bg-muted px-1 font-mono text-xs">DELETE</code> to confirm
                </Label>
                <Input
                  id="delConfirm"
                  type="text"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={busy || !password || (mfaEnabled && !mfaCode) || confirmText !== "DELETE"}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {busy ? "Deleting…" : "Permanently delete my account"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setOpen(false);
                    setPassword("");
                    setMfaCode("");
                    setConfirmText("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
