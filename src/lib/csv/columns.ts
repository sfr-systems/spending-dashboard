// Maps each canonical field to the regex patterns we try to match against CSV headers.
// Order matters for ambiguous headers — more specific patterns should come before generic ones.

export type ColumnField =
  | "transactionDate"
  | "postedDate"
  | "description"
  | "amount"
  | "debit"
  | "credit"
  | "category"
  | "accountName"
  | "merchant"
  | "transactionType"
  | "notes";

const PATTERNS: Record<ColumnField, RegExp> = {
  transactionDate:
    /^(transaction\s*)?date$|^trans\.?\s*date$|^date\s*of\s*transaction$|^txn\s*date$/i,
  postedDate: /^posted?\s*(date)?$|^posting\s*date$|^settlement\s*date$|^process(ed)?\s*date$/i,
  description:
    /^description$|^memo$|^payee$|^name$|^original\s*description$|^transaction\s*description$|^details$|^narrative$|^particulars$/i,
  merchant: /^merchant(\s*name)?$|^vendor(\s*name)?$|^store$/i,
  amount: /^amount$|^transaction\s*amount$|^amt$|^sum$/i,
  debit: /^debit$|^withdrawal(s)?$|^debit\s*amount$|^out(going)?$/i,
  credit: /^credit$|^deposit(s)?$|^credit\s*amount$|^in(coming)?$/i,
  category: /^categor(y|ies)$|^spending\s*category$/i,
  accountName: /^account(\s*(name|title))?$|^acct$/i,
  transactionType: /^(transaction\s*)?type$|^kind$/i,
  notes: /^notes?$|^comment(s)?$|^remark(s)?$|^label(s)?$/i,
};

export interface ColumnMap {
  transactionDate?: number;
  postedDate?: number;
  description?: number;
  merchant?: number;
  amount?: number;
  debit?: number;
  credit?: number;
  category?: number;
  accountName?: number;
  transactionType?: number;
  notes?: number;
}

export function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const normalized = headers.map((h) => h.trim().toLowerCase());

  for (const [field, pattern] of Object.entries(PATTERNS) as [ColumnField, RegExp][]) {
    const idx = normalized.findIndex((h) => pattern.test(h));
    if (idx !== -1) {
      (map as Record<string, number>)[field] = idx;
    }
  }

  // If we found both debit and credit columns, clear the generic amount column
  // so the combiner logic in parseCSV uses debit/credit instead.
  if (map.debit !== undefined && map.credit !== undefined) {
    delete map.amount;
  }

  return map;
}

export function isUsableMap(map: ColumnMap): boolean {
  const hasDate = map.transactionDate !== undefined || map.postedDate !== undefined;
  const hasAmount =
    map.amount !== undefined ||
    (map.debit !== undefined && map.credit !== undefined) ||
    map.debit !== undefined ||
    map.credit !== undefined;
  const hasDescription = map.description !== undefined || map.merchant !== undefined;
  return hasDate && hasAmount && hasDescription;
}
