import { parse } from "csv-parse/sync";
import { detectColumns, isUsableMap, ColumnMap } from "./columns";
import {
  normalizeAmount,
  normalizeDate,
  normalizeDescription,
  inferTransactionType,
} from "./normalize";

export interface ParsedTransaction {
  transactionDate: Date;
  postedDate: Date | null;
  description: string;
  merchant: string | null;
  amount: number;
  category: string;
  transactionType: string;
  accountName: string | null;
  notes: string | null;
  rawData: Record<string, string>;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  rowCount: number;
  skippedRows: number;
  error: string | null;
}

export function parseCSVBuffer(buffer: Buffer): ParseResult {
  let records: string[][];
  try {
    records = parse(buffer, {
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
    }) as string[][];
  } catch (err) {
    return {
      transactions: [],
      rowCount: 0,
      skippedRows: 0,
      error: err instanceof Error ? err.message : "Failed to parse CSV",
    };
  }

  if (records.length < 2) {
    return { transactions: [], rowCount: 0, skippedRows: 0, error: "CSV has no data rows" };
  }

  const headers = records[0];
  const map: ColumnMap = detectColumns(headers);

  if (!isUsableMap(map)) {
    return {
      transactions: [],
      rowCount: 0,
      skippedRows: 0,
      error: `Could not detect required columns (date, amount, description) in headers: ${headers.join(", ")}`,
    };
  }

  const dataRows = records.slice(1);
  const transactions: ParsedTransaction[] = [];
  let skippedRows = 0;

  for (const row of dataRows) {
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      raw[h] = row[i] ?? "";
    });

    // Resolve date
    const dateColIdx = map.transactionDate ?? map.postedDate!;
    const transactionDate = normalizeDate(row[dateColIdx] ?? "");
    if (!transactionDate) {
      skippedRows++;
      continue;
    }

    const postedDate =
      map.postedDate !== undefined && map.postedDate !== dateColIdx
        ? normalizeDate(row[map.postedDate] ?? "")
        : null;

    // Resolve amount
    let amount: number | null = null;
    if (map.amount !== undefined) {
      amount = normalizeAmount(row[map.amount] ?? "");
    } else if (map.debit !== undefined || map.credit !== undefined) {
      const debitVal = map.debit !== undefined ? normalizeAmount(row[map.debit] ?? "") : null;
      const creditVal = map.credit !== undefined ? normalizeAmount(row[map.credit] ?? "") : null;
      // Debit columns typically store positive values representing money out
      const debit = debitVal != null && debitVal !== 0 ? -Math.abs(debitVal) : null;
      const credit = creditVal != null && creditVal !== 0 ? Math.abs(creditVal) : null;
      amount = debit ?? credit;
    }

    if (amount === null) {
      skippedRows++;
      continue;
    }

    // Resolve description
    const descColIdx = map.description ?? map.merchant;
    const rawDesc = descColIdx !== undefined ? (row[descColIdx] ?? "") : "";
    const description = normalizeDescription(rawDesc);
    if (!description) {
      skippedRows++;
      continue;
    }

    const merchant =
      map.merchant !== undefined && map.merchant !== descColIdx
        ? normalizeDescription(row[map.merchant] ?? "") || null
        : null;

    const category =
      map.category !== undefined ? (row[map.category]?.trim() || "Uncategorized") : "Uncategorized";

    const transactionType =
      map.transactionType !== undefined
        ? (row[map.transactionType]?.trim() || inferTransactionType(amount))
        : inferTransactionType(amount);

    const accountName =
      map.accountName !== undefined ? (row[map.accountName]?.trim() || null) : null;

    const notes =
      map.notes !== undefined ? (row[map.notes]?.trim() || null) : null;

    transactions.push({
      transactionDate,
      postedDate,
      description,
      merchant,
      amount,
      category,
      transactionType,
      accountName,
      notes,
      rawData: raw,
    });
  }

  return {
    transactions,
    rowCount: dataRows.length,
    skippedRows,
    error: null,
  };
}
