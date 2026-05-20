"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { columns, TransactionRow } from "./columns";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type SourceOption = { id: string; label: string; kind: "csv" | "bank" };

interface TransactionsTableProps {
  transactions: TransactionRow[];
  categories: string[];
  sources: SourceOption[];
}

const PAGE_SIZE = 50;

export function TransactionsTable({ transactions, categories, sources }: TransactionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "transactionDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [excludedSources, setExcludedSources] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let rows = transactions;
    if (categoryFilter) rows = rows.filter((r) => r.category === categoryFilter);
    if (excludedSources.size > 0) {
      rows = rows.filter((r) => r.sourceId == null || !excludedSources.has(r.sourceId));
    }
    return rows;
  }, [transactions, categoryFilter, excludedSources]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const hasFilters = Boolean(globalFilter) || Boolean(categoryFilter) || excludedSources.size > 0;

  function clearFilters() {
    setGlobalFilter("");
    setCategoryFilter("");
    setExcludedSources(new Set());
  }

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search descriptions…"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              table.setPageIndex(0);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            table.setPageIndex(0);
          }}
          className="w-[160px]"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <SourceMultiSelect
          sources={sources}
          excluded={excludedSources}
          onChange={(next) => {
            setExcludedSources(next);
            table.setPageIndex(0);
          }}
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-muted/40">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-muted-foreground first:pl-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {hasFilters ? "No transactions match your filters." : "No transactions yet."}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalRows === 0 ? "0 results" : `${from}–${to} of ${totalRows.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 tabular-nums">
            {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SourceMultiSelectProps {
  sources: SourceOption[];
  excluded: Set<string>;
  onChange: (next: Set<string>) => void;
}

function SourceMultiSelect({ sources, excluded, onChange }: SourceMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const bankSources = sources.filter((s) => s.kind === "bank");
  const csvSources = sources.filter((s) => s.kind === "csv");
  const visibleCount = sources.length - excluded.size;

  const label = (() => {
    if (sources.length === 0) return "No sources";
    if (excluded.size === 0) return "All sources";
    if (visibleCount === 0) return "No sources selected";
    if (visibleCount === 1) {
      const only = sources.find((s) => !excluded.has(s.id));
      return only?.label ?? "1 source";
    }
    return `${visibleCount} of ${sources.length} sources`;
  })();

  function toggle(id: string) {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function selectAll() {
    onChange(new Set());
  }
  function clearAll() {
    onChange(new Set(sources.map((s) => s.id)));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={sources.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-[220px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 z-20 mt-1 max-h-80 w-[280px] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
            <button
              type="button"
              onClick={selectAll}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Clear
            </button>
          </div>

          {bankSources.length > 0 && (
            <SourceGroup
              label="Connected banks"
              items={bankSources}
              excluded={excluded}
              onToggle={toggle}
            />
          )}
          {csvSources.length > 0 && (
            <SourceGroup
              label="CSV files"
              items={csvSources}
              excluded={excluded}
              onToggle={toggle}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SourceGroup({
  label,
  items,
  excluded,
  onToggle,
}: {
  label: string;
  items: SourceOption[];
  excluded: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="py-1">
      <div className="px-3 pt-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {items.map((s) => {
        const checked = !excluded.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={checked}
            onClick={() => onToggle(s.id)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <span
              className={
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                (checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background")
              }
              aria-hidden="true"
            >
              {checked && <Check className="h-3 w-3" />}
            </span>
            <span className="truncate">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
