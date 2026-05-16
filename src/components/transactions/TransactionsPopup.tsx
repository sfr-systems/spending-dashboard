"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionsTable } from "./TransactionsTable";
import type { TransactionRow } from "./columns";

interface TransactionsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TransactionData {
  transactions: TransactionRow[];
  categories: string[];
  files: { id: string; originalFilename: string }[];
}

export function TransactionsPopup({ open, onOpenChange }: TransactionsPopupProps) {
  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;

    setLoading(true);
    setError(null);

    fetch("/api/transactions")
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((d: TransactionData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load transactions.");
        setLoading(false);
      });
  }, [open, data]);

  // Reset data when closed so it re-fetches next time
  function handleOpenChange(next: boolean) {
    if (!next) setData(null);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[92vw] w-[92vw] max-h-[88vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle>Transactions</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Loading transactions…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-40 text-sm text-destructive">
              {error}
            </div>
          )}
          {data && (
            <TransactionsTable
              transactions={data.transactions}
              categories={data.categories}
              files={data.files}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
