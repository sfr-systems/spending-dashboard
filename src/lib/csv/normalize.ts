// Normalizes raw string values from CSV rows into typed values.

export function normalizeAmount(raw: string): number | null {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return null;

  let s = raw.trim();

  // Parentheses = negative in accounting notation: (1,234.56) → -1234.56
  const isParenNegative = s.startsWith("(") && s.endsWith(")");
  if (isParenNegative) s = s.slice(1, -1);

  // Strip currency symbols, spaces, thousands separators
  s = s.replace(/[^0-9.\-]/g, "");

  const n = parseFloat(s);
  if (isNaN(n)) return null;

  return isParenNegative ? -Math.abs(n) : n;
}

const DATE_FORMATS: Array<(s: string) => Date | null> = [
  // ISO 8601: 2024-01-15
  (s) => {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d.getTime()) ? null : d;
  },
  // MM/DD/YYYY or MM-DD-YYYY
  (s) => {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!m) return null;
    const d = new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
    return isNaN(d.getTime()) ? null : d;
  },
  // YYYY/MM/DD
  (s) => {
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d.getTime()) ? null : d;
  },
  // MM/DD/YY
  (s) => {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (!m) return null;
    const year = +m[3] >= 50 ? 1900 + +m[3] : 2000 + +m[3];
    const d = new Date(Date.UTC(year, +m[1] - 1, +m[2]));
    return isNaN(d.getTime()) ? null : d;
  },
  // "Jan 15, 2024" or "January 15, 2024"
  (s) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    // Return as UTC midnight to avoid timezone shifting
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  },
];

export function normalizeDate(raw: string): Date | null {
  if (!raw || raw.trim() === "") return null;
  const s = raw.trim();
  for (const fmt of DATE_FORMATS) {
    const d = fmt(s);
    if (d) return d;
  }
  return null;
}

export function normalizeDescription(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function inferTransactionType(amount: number): string {
  if (amount > 0) return "credit";
  if (amount < 0) return "debit";
  return "unknown";
}
