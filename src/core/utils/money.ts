import type { RegionConfig } from '@config';

/** Format an amount the way the region's customers would read it (used in logs and reports). */
export function formatMoney(amount: number, region: Pick<RegionConfig, 'locale' | 'currency'>): string {
  return new Intl.NumberFormat(region.locale, { style: 'currency', currency: region.currency }).format(amount);
}

/**
 * Parse a money string as rendered by the ParaBank UI, e.g. "$1,234.50" or "-$20.00".
 * ParaBank always renders en-US / USD regardless of region, so this parser is intentionally fixed.
 */
export function parseUiMoney(text: string): number {
  const trimmed = text.trim();
  const negative = trimmed.startsWith('-') || trimmed.startsWith('(');
  const value = Number(trimmed.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(value)) throw new Error(`Cannot parse money from "${text}"`);
  return negative ? -value : value;
}

/** Round to cents to avoid floating-point noise when comparing balances. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
