export function fmtUSD0(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Short axis-style money: $850, $1.2k, $12k. */
export function fmtUSDCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1000) {
    const k = abs / 1000;
    const text = k >= 10 ? Math.round(k).toString() : parseFloat(k.toFixed(1)).toString();
    return `${sign}$${text}k`;
  }
  return `${sign}$${Math.round(abs)}`;
}
