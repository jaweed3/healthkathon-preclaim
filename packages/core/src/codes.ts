/** `47.09 — Apendektomi lainnya` → `47.09` */
export const codeOf = (label: string): string => label.split(" — ")[0].trim();

/** `"4 hari"` → `4`; anything unparsable counts as 0 rather than NaN. */
export const daysOf = (length: string): number => {
  const n = Number.parseInt(length, 10);
  return Number.isFinite(n) ? n : 0;
};

/** `"Rp 18.450.000"` → `18450000`, for amount comparisons. */
export const amountOf = (amount: string): number => {
  const digits = amount.replace(/[^\d]/g, "");
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
};
