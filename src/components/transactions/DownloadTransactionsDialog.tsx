"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TransactionRow } from "./columns";

type ColumnDef = {
  header: string;
  get: (t: TransactionRow) => string | number | null | undefined;
};

// Columns present in the raw bank/CSV data (no enrichment).
const RAW_COLUMNS: ColumnDef[] = [
  { header: "Date", get: (t) => new Date(t.transactionDate).toISOString().slice(0, 10) },
  { header: "Description", get: (t) => t.description },
  { header: "Amount", get: (t) => t.amount.toFixed(2) },
  { header: "Category", get: (t) => t.category },
  { header: "Type", get: (t) => t.transactionType },
  { header: "Source", get: (t) => t.sourceLabel },
];

// Columns derived/added by SpendWise. To add a future custom column,
// append it here and it'll automatically be included in the enriched export.
const ENRICHED_EXTRA_COLUMNS: ColumnDef[] = [
  { header: "Cleaned Name", get: (t) => t.cleanedDescription },
  { header: "Smart Category", get: (t) => t.derivedCategory },
  { header: "Merchant", get: (t) => t.merchant },
  { header: "Account", get: (t) => t.accountName },
];

type Mode = "raw" | "enriched";

interface Props {
  transactions: TransactionRow[];
}

export function DownloadTransactionsDialog({ transactions }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("enriched");

  function download() {
    const columns = mode === "raw" ? RAW_COLUMNS : [...RAW_COLUMNS, ...ENRICHED_EXTRA_COLUMNS];
    const csv = buildCsv(columns, transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={transactions.length === 0}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download transactions</DialogTitle>
          <DialogDescription>
            {transactions.length.toLocaleString()} transaction
            {transactions.length === 1 ? "" : "s"} will be exported as CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <ModeOption
            label="Raw data only"
            description="The original columns from your bank or CSV: date, description, amount, category, type, source."
            checked={mode === "raw"}
            onSelect={() => setMode("raw")}
          />
          <ModeOption
            label="Include cleaned data"
            description="Adds the SpendWise columns on top of the raw data: Cleaned Name, Smart Category, Merchant, Account."
            checked={mode === "enriched"}
            onSelect={() => setMode("enriched")}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={download}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeOption({
  label,
  description,
  checked,
  onSelect,
}: {
  label: string;
  description: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors " +
        (checked
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent/40")
      }
    >
      <span
        className={
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
          (checked ? "border-primary" : "border-input")
        }
        aria-hidden="true"
      >
        {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function buildCsv(columns: ColumnDef[], rows: TransactionRow[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCsv(c.header)).join(","));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsv(c.get(row))).join(","));
  }
  return lines.join("\n");
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
