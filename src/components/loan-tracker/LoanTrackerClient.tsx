"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoanInterestBarChart, type MonthlyBar } from "./LoanInterestBarChart";

type Payment = {
  id: string;
  amount: number;
  paymentDate: string; // ISO
};

type Loan = {
  id: string;
  initialAmount: number;
  startDate: string; // ISO
  avgMonthlyCharge: number;
  payments: Payment[];
};

interface Props {
  monthly: MonthlyBar[];
  averageInterestSuggestion: number;
  loan: Loan | null;
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtUSD0(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function todayIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-");
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function toMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function LoanTrackerClient({ monthly, averageInterestSuggestion, loan }: Props) {
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const loanStartMonthKey = loan ? toMonthKey(loan.startDate) : null;
  const avgCharge = loan ? loan.avgMonthlyCharge : null;

  const monthsSinceLoan = useMemo(() => {
    if (!loanStartMonthKey || !avgCharge) return [];
    return monthly
      .filter((m) => m.monthKey >= loanStartMonthKey)
      .map((m) => ({
        ...m,
        netSavings: avgCharge - m.total, // positive = saved
      }));
  }, [monthly, loanStartMonthKey, avgCharge]);

  const totalActualInterest = monthsSinceLoan.reduce((s, m) => s + m.total, 0);
  const totalAvgInterest = avgCharge ? avgCharge * monthsSinceLoan.length : 0;
  const totalSavings = totalAvgInterest - totalActualInterest;
  const avgMonthlySavings = monthsSinceLoan.length > 0 ? totalSavings / monthsSinceLoan.length : 0;

  const totalPaid = loan ? loan.payments.reduce((s, p) => s + p.amount, 0) : 0;
  const progressPct = loan ? Math.min(100, (totalPaid / loan.initialAmount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-300 via-violet-300 to-pink-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            Loan Tracker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track a loan against your monthly purchase interest charges.
          </p>
        </div>
        <div className="flex gap-2">
          {loan ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Edit loan
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setSetupOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Start a loan
            </Button>
          )}
        </div>
      </div>

      {/* Totals row (only when loan started) */}
      {loan && monthsSinceLoan.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryStat
            label="Total savings since loan"
            value={totalSavings}
            tone={totalSavings >= 0 ? "good" : "bad"}
            sub={`vs. ${fmtUSD(avgCharge ?? 0)}/mo baseline`}
          />
          <SummaryStat
            label="Avg monthly savings"
            value={avgMonthlySavings}
            tone={avgMonthlySavings >= 0 ? "good" : "bad"}
            sub={`across ${monthsSinceLoan.length} month${monthsSinceLoan.length === 1 ? "" : "s"}`}
          />
          <SummaryStat
            label="Loan paid off"
            value={totalPaid}
            tone="neutral"
            sub={`${progressPct.toFixed(1)}% of ${fmtUSD(loan.initialAmount)}`}
          />
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Monthly purchase interest charges
        </h2>
        <LoanInterestBarChart
          data={monthly}
          avgMonthlyCharge={avgCharge ?? (loan ? null : averageInterestSuggestion)}
          loanStartMonthKey={loanStartMonthKey}
        />
      </div>

      {/* Months since loan table */}
      {loan && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Months since loan started
          </h2>
          {monthsSinceLoan.length === 0 ? (
            <p className="text-sm text-muted-foreground">No months elapsed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Month</th>
                    <th className="py-2 pr-3 font-medium text-right">Interest charges</th>
                    <th className="py-2 font-medium text-right">Savings vs. avg</th>
                  </tr>
                </thead>
                <tbody>
                  {monthsSinceLoan.map((m) => {
                    const isSaving = m.netSavings >= 0;
                    return (
                      <tr key={m.monthKey} className="border-b border-border/40 last:border-0">
                        <td className="py-2 pr-3">{monthLabelFromKey(m.monthKey)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(m.total)}</td>
                        <td className={`py-2 text-right tabular-nums font-medium ${isSaving ? "text-green-500" : "text-red-500"}`}>
                          {isSaving ? "+" : "−"}{fmtUSD(Math.abs(m.netSavings))}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(totalActualInterest)}</td>
                    <td className={`py-2 text-right tabular-nums ${totalSavings >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {totalSavings >= 0 ? "+" : "−"}{fmtUSD(Math.abs(totalSavings))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Progress + payments */}
      {loan && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Loan payoff progress
            </h2>
            <span className="text-xs text-muted-foreground">
              Initial loan {fmtUSD(loan.initialAmount)}
            </span>
          </div>
          <p className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Note:</span> this is a loan with 0%
            interest indefinitely — not representative of real-world loans, which would accrue
            interest and require payment deadlines.
          </p>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums">{fmtUSD(totalPaid)}</span>
            <span className="text-2xl font-semibold tabular-nums text-muted-foreground">
              {progressPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-6 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs text-muted-foreground">
            {fmtUSD0(Math.max(0, loan.initialAmount - totalPaid))} remaining
          </div>

          <div className="mt-5 flex justify-end">
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add payment
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium text-right">Amount</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {loan.payments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  loan.payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2 pr-3">
                        {new Date(p.paymentDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(p.amount)}</td>
                      <td className="py-2">
                        <button
                          aria-label="Delete payment"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={async () => {
                            if (!confirm("Delete this payment?")) return;
                            await fetch(`/api/loan/payments/${p.id}`, { method: "DELETE" });
                            router.refresh();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {loan.payments.length > 0 && (
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtUSD(totalPaid)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SetupLoanDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        suggestion={averageInterestSuggestion}
        existing={loan}
        onSaved={() => {
          setSetupOpen(false);
          router.refresh();
        }}
      />

      <AddPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onSaved={() => {
          setPaymentOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: "good" | "bad" | "neutral";
  sub?: string;
}) {
  const color =
    tone === "good" ? "text-green-500" : tone === "bad" ? "text-red-500" : "text-foreground";
  const sign = tone === "good" ? "+" : tone === "bad" ? "−" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>
        {sign}
        {fmtUSD(Math.abs(value))}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SetupLoanDialog({
  open,
  onOpenChange,
  suggestion,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  suggestion: number;
  existing: Loan | null;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [initialAmount, setInitialAmount] = useState(
    existing ? String(existing.initialAmount) : "",
  );
  const [startDate, setStartDate] = useState(
    existing ? existing.startDate.slice(0, 10) : todayIso(),
  );
  const [avgMonthlyCharge, setAvgMonthlyCharge] = useState(
    existing ? String(existing.avgMonthlyCharge) : suggestion > 0 ? suggestion.toFixed(2) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialAmount: Number(initialAmount),
          startDate,
          avgMonthlyCharge: Number(avgMonthlyCharge),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save loan");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLoan = async () => {
    if (!confirm("Delete this loan and all its payments?")) return;
    await fetch("/api/loan", { method: "DELETE" });
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit loan" : "Start a loan"}</DialogTitle>
          <DialogDescription>
            Track a loan you took out to pay down credit card balances and avoid further purchase
            interest charges.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="initialAmount">Initial loan amount</Label>
            <Input
              id="initialAmount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="5000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="startDate">Loan start date</Label>
            <Input
              id="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="avgMonthlyCharge">Average monthly purchase interest charge</Label>
            <Input
              id="avgMonthlyCharge"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={avgMonthlyCharge}
              onChange={(e) => setAvgMonthlyCharge(e.target.value)}
              placeholder={suggestion > 0 ? suggestion.toFixed(2) : "0.00"}
            />
            {suggestion > 0 && (
              <p className="text-xs text-muted-foreground">
                Suggested from your transaction history: {fmtUSD(suggestion)}.
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            {existing && (
              <Button type="button" variant="outline" onClick={deleteLoan} className="text-red-500 hover:text-red-500">
                Delete loan
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : existing ? "Save changes" : "Start loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddPaymentDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/loan/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), paymentDate }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to add payment");
      }
      setAmount("");
      setPaymentDate(todayIso());
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a payment</DialogTitle>
          <DialogDescription>Log a payment you made toward the loan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="payAmount">Amount</Label>
            <Input
              id="payAmount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payDate">Date</Label>
            <Input
              id="payDate"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Add payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
