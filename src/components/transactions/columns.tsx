"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type TransactionRow = {
  id: string;
  transactionDate: string; // ISO string
  description: string;
  merchant: string | null;
  amount: number;
  category: string;
  transactionType: string;
  accountName: string | null;
  filename: string;
  fileId: string;
};

function SortHeader({
  column,
  label,
}: {
  column: Parameters<ColumnDef<TransactionRow>["header"] extends ((...args: infer A) => unknown) ? (...args: A) => unknown : never>[0] extends { column: infer C } ? C : never;
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => (column as { toggleSorting: (desc?: boolean) => void }).toggleSorting(
        (column as { getIsSorted: () => string | false }).getIsSorted() === "asc"
      )}
    >
      {label}
      <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
    </Button>
  );
}

export const columns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "transactionDate",
    header: ({ column }) => <SortHeader column={column as never} label="Date" />,
    cell: ({ getValue }) => {
      const iso = getValue<string>();
      return (
        <span className="tabular-nums text-muted-foreground">
          {new Date(iso).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}
        </span>
      );
    },
    sortingFn: "datetime",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const desc = row.original.description;
      const merchant = row.original.merchant;
      return (
        <div className="max-w-[260px]">
          <p className="truncate font-medium">{desc}</p>
          {merchant && merchant !== desc && (
            <p className="truncate text-xs text-muted-foreground">{merchant}</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <div className="flex justify-end">
        <SortHeader column={column as never} label="Amount" />
      </div>
    ),
    cell: ({ getValue }) => {
      const amount = getValue<number>();
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(Math.abs(amount));
      return (
        <div className="text-right tabular-nums">
          <span className={amount < 0 ? "text-destructive" : "text-green-600"}>
            {amount < 0 ? `-${formatted}` : `+${formatted}`}
          </span>
        </div>
      );
    },
    sortingFn: "basic",
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "transactionType",
    header: "Type",
    cell: ({ getValue }) => {
      const type = getValue<string>();
      if (type === "credit") return <Badge variant="success">Credit</Badge>;
      if (type === "debit") return <Badge variant="secondary">Debit</Badge>;
      return <Badge variant="outline">{type}</Badge>;
    },
  },
  {
    accessorKey: "filename",
    header: "Source file",
    cell: ({ getValue }) => (
      <span className="max-w-[140px] truncate text-xs text-muted-foreground">
        {getValue<string>()}
      </span>
    ),
  },
];
