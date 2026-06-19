/**
 * Money — integer minor units only. Never floats, never client-side balance math.
 *
 * Three currencies in DEMO:
 *   - CREDITS : fan, spendable, NON-cashable. Internal unit (no sub-unit).
 *   - NGN     : Nigerian Naira, minor unit = kobo (100 kobo = 1 NGN).
 *   - USD     : minor unit = cents (verification price points).
 *
 * Creator EARNINGS are also NGN/USD but are a *distinct* concept from Credits in the UI and must
 * never be presented as interchangeable. This module enforces currency safety: you cannot add two
 * different currencies, and amounts are always integers.
 */

export type Currency = "CREDITS" | "NGN" | "USD";

const MINOR_UNITS_PER_MAJOR: Record<Currency, number> = {
  CREDITS: 1, // Credits have no sub-unit
  NGN: 100, // kobo
  USD: 100, // cents
};

export type Money = {
  readonly currency: Currency;
  /** Integer amount in minor units (kobo, cents, or whole Credits). */
  readonly minor: number;
};

export class MoneyError extends Error {}

/** Construct from minor units (the canonical, server-facing form). */
export function fromMinor(minor: number, currency: Currency): Money {
  if (!Number.isInteger(minor)) {
    throw new MoneyError(`Money must be an integer in minor units, got ${minor}`);
  }
  return { currency, minor };
}

/** Construct from a major-unit amount (e.g. 500 NGN → 50000 kobo). Rounds to nearest minor unit. */
export function fromMajor(major: number, currency: Currency): Money {
  return fromMinor(Math.round(major * MINOR_UNITS_PER_MAJOR[currency]), currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return fromMinor(a.minor + b.minor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return fromMinor(a.minor - b.minor, a.currency);
}

/** Multiply by a count (e.g. vote cost × votes). Rounds to an integer minor unit. */
export function multiply(a: Money, factor: number): Money {
  return fromMinor(Math.round(a.minor * factor), a.currency);
}

export function isZero(a: Money): boolean {
  return a.minor === 0;
}

export function gte(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return a.minor >= b.minor;
}

const LOCALE = "en-NG";

/**
 * Format for display. Credits render as a plain count with the unit label (never a currency symbol,
 * to avoid implying they cash out). NGN/USD render with proper currency formatting.
 */
export function format(money: Money, opts?: { compact?: boolean }): string {
  if (money.currency === "CREDITS") {
    const n = money.minor;
    if (opts?.compact && n >= 1000) {
      return `${new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(n)} Credits`;
    }
    return `${new Intl.NumberFormat(LOCALE).format(n)} ${n === 1 ? "Credit" : "Credits"}`;
  }

  const major = money.minor / MINOR_UNITS_PER_MAJOR[money.currency];
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 2,
    notation: opts?.compact ? "compact" : "standard",
  }).format(major);
}

export const zero = (currency: Currency): Money => fromMinor(0, currency);
