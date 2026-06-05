/**
 * @fileoverview Currency formatting and conversion utilities.
 * Supports RTL display for Arabic locales.
 * @module @tagmytaxi/shared/utils/currency
 */

import type { CurrencyCode } from '../types/common';

/**
 * Formats a monetary amount as a localised currency string.
 * Handles RTL for Arabic locales (e.g. "١٢٣٫٤٥ د.إ").
 *
 * @param amount - The amount to format.
 * @param currency - ISO 4217 currency code.
 * @param locale - BCP 47 locale string. Defaults to 'en-US'.
 * @returns Formatted currency string.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  locale: string = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency as string,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Converts an amount from one currency to another using provided exchange rates.
 *
 * @param amount - The amount to convert.
 * @param from - Source currency code.
 * @param to - Target currency code.
 * @param rates - Exchange rates map (base currency → rate). Must include both `from` and `to`.
 * @returns Converted amount, rounded to 2 decimal places.
 * @throws {Error} if either currency is not present in `rates`.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Readonly<Record<string, number>>,
): number {
  const fromRate = rates[from as string];
  const toRate = rates[to as string];
  if (fromRate === undefined) throw new Error(`Exchange rate not found for ${from}`);
  if (toRate === undefined) throw new Error(`Exchange rate not found for ${to}`);
  return Math.round((amount / fromRate) * toRate * 100) / 100;
}

/**
 * Returns the number of decimal places used by a currency.
 * Most currencies use 2; some (JPY, KWD) use 0 or 3.
 *
 * @param currency - ISO 4217 currency code.
 * @returns Decimal places.
 */
export function getCurrencyDecimals(currency: CurrencyCode): number {
  const zeroDecimals: ReadonlyArray<string> = ['JPY', 'KRW', 'VND', 'BIF', 'CLP'];
  const threeDecimals: ReadonlyArray<string> = ['KWD', 'BHD', 'OMR', 'JOD'];
  if (zeroDecimals.includes(currency as string)) return 0;
  if (threeDecimals.includes(currency as string)) return 3;
  return 2;
}
