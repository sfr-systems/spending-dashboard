"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  convertBenchmarkUnit,
  type BenchmarkMode,
  type CurrentSpendingPrefs,
  type ViewMode,
} from "@/lib/currentSpending";
import { fmtUSD0 } from "./format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: CurrentSpendingPrefs;
  view: ViewMode;
  incomeAvgPerPeriod: number | null;
  onSave: (patch: Partial<CurrentSpendingPrefs>) => void;
}

function ChoiceCard({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40",
      )}
    >
      <input
        type="radio"
        name="benchmarkMode"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
      />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

export function BenchmarkDialog({
  open,
  onOpenChange,
  prefs,
  view,
  incomeAvgPerPeriod,
  onSave,
}: Props) {
  const [mode, setMode] = useState<BenchmarkMode>(prefs.benchmark.mode);
  const [incomePercent, setIncomePercent] = useState(String(prefs.benchmark.incomePercent));
  const [manualAmount, setManualAmount] = useState(
    prefs.benchmark.manualAmount > 0 ? String(prefs.benchmark.manualAmount) : "",
  );
  const [manualUnit, setManualUnit] = useState<ViewMode>(prefs.benchmark.manualUnit);
  const [includeTransfersOut, setIncludeTransfersOut] = useState(prefs.includeTransfersOut);

  // Re-seed the form from saved prefs each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setMode(prefs.benchmark.mode);
    setIncomePercent(String(prefs.benchmark.incomePercent));
    setManualAmount(prefs.benchmark.manualAmount > 0 ? String(prefs.benchmark.manualAmount) : "");
    setManualUnit(prefs.benchmark.manualUnit);
    setIncludeTransfersOut(prefs.includeTransfersOut);
  }, [open, prefs]);

  const noun = view === "week" ? "week" : "month";
  const pctNum = Number(incomePercent);
  const hasIncome = incomeAvgPerPeriod !== null && incomeAvgPerPeriod > 0;
  const previewIncome =
    hasIncome && Number.isFinite(pctNum) && pctNum > 0
      ? (incomeAvgPerPeriod * pctNum) / 100
      : null;
  const manualNum = Number(manualAmount);
  const otherUnit: ViewMode = manualUnit === "week" ? "month" : "week";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      benchmark: {
        mode,
        incomePercent: Number.isFinite(pctNum) && pctNum > 0 ? Math.min(500, pctNum) : 100,
        manualAmount: Number.isFinite(manualNum) && manualNum > 0 ? manualNum : 0,
        manualUnit,
      },
      includeTransfersOut,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Benchmark</DialogTitle>
          <DialogDescription>
            The spending target this page measures you against.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Benchmark source</legend>
            <ChoiceCard
              checked={mode === "income"}
              onChange={() => setMode("income")}
              title="Based on income"
              description="Uses transactions categorized as income over your average window."
            />
            <ChoiceCard
              checked={mode === "manual"}
              onChange={() => setMode("manual")}
              title="Manual amount"
              description="A fixed budget you choose."
            />
          </fieldset>

          {mode === "income" ? (
            <div className="grid gap-2">
              <Label htmlFor="incomePercent">Spend up to this percent of income</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="incomePercent"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  step={1}
                  value={incomePercent}
                  onChange={(e) => setIncomePercent(e.target.value)}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasIncome ? (
                  <>
                    Income averages {fmtUSD0(incomeAvgPerPeriod)} per {noun} over your average
                    window
                    {previewIncome !== null ? (
                      <>
                        , so the benchmark is <strong>{fmtUSD0(previewIncome)}</strong> per {noun}
                      </>
                    ) : null}
                    .
                  </>
                ) : (
                  <>
                    No income found in your average window. Income is detected from transactions
                    categorized as Income, Payroll, or Salary. Pick a manual amount if your export
                    does not include those.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="manualAmount">Budget</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="manualAmount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="1"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder={manualUnit === "week" ? "600" : "2500"}
                  className="flex-1"
                />
                <Select
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value as ViewMode)}
                  aria-label="Budget period"
                  className="w-32"
                >
                  <option value="week">per week</option>
                  <option value="month">per month</option>
                </Select>
              </div>
              {Number.isFinite(manualNum) && manualNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  About {fmtUSD0(convertBenchmarkUnit(manualNum, manualUnit, otherUnit))} per{" "}
                  {otherUnit}.
                </p>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={includeTransfersOut}
              onChange={(e) => setIncludeTransfersOut(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[hsl(var(--primary))]"
            />
            <span>
              Count transfers out as spending
              <span className="block text-xs text-muted-foreground">
                Venmo, Zelle, and account transfers. Off by default, matching the Dashboard.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
