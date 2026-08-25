/**
 * Currency conversion utilities
 * Handles USD to GHS conversion for Paystack Ghana integration
 */

export interface ExchangeRates {
  USD_TO_GHS: number;
}

// Exchange rate from environment variable
const usdToGhsRate = parseFloat(process.env.USD_TO_GHS_RATE || "14.75");

export const EXCHANGE_RATES: ExchangeRates = {
  USD_TO_GHS: usdToGhsRate,
};

/**
 * Convert USD amount to GHS
 * @param usdAmount - Amount in USD
 * @returns Amount in GHS (rounded to 2 decimal places)
 */
export function convertUSDtoGHS(usdAmount: number): number {
  if (usdAmount <= 0) return 0;
  const ghsAmount = usdAmount * EXCHANGE_RATES.USD_TO_GHS;
  return Math.round(ghsAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert GHS amount to USD
 * @param ghsAmount - Amount in GHS
 * @returns Amount in USD (rounded to 2 decimal places)
 */
export function convertGHStoUSD(ghsAmount: number): number {
  if (ghsAmount <= 0) return 0;
  const usdAmount = ghsAmount / EXCHANGE_RATES.USD_TO_GHS;
  return Math.round(usdAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Format currency amount with appropriate symbol
 * @param amount - Amount to format
 * @param currency - Currency code ('USD' or 'GHS')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: 'USD' | 'GHS'): string {
  const symbol = currency === 'USD' ? '$' : '¢';
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get currency symbol
 * @param currency - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: 'USD' | 'GHS'): string {
  return currency === 'USD' ? '$' : '¢';
}

/**
 * Convert amount to smallest currency unit (cents/pesewas)
 * @param amount - Amount in main currency unit
 * @param currency - Currency code
 * @returns Amount in smallest unit (integer)
 */
export function toSmallestUnit(amount: number, currency: 'USD' | 'GHS'): number {
  return Math.round(amount * 100);
}

/**
 * Convert from smallest currency unit to main unit
 * @param amount - Amount in smallest unit
 * @param currency - Currency code
 * @returns Amount in main unit
 */
export function fromSmallestUnit(amount: number, currency: 'USD' | 'GHS'): number {
  return amount / 100;
}

/**
 * Payment conversion result
 */
export interface PaymentConversion {
  amountUSD: number | null; // null when sourceCurrency is GHS - there is no USD leg
  amountGHS: number;
  exchangeRate: number;
  sourceCurrency: 'USD' | 'GHS';
  formattedUSD: string;
  formattedGHS: string;
}

/**
 * Convert payment amount with full details. GHS-priced courses are charged
 * as-is (no conversion); USD-priced courses are converted to GHS via the
 * fixed exchange rate for Paystack.
 * @param amount - Amount in the given sourceCurrency
 * @param sourceCurrency - Currency the amount is already denominated in
 * @returns Complete conversion details
 */
export function convertPayment(amount: number, sourceCurrency: 'USD' | 'GHS' = 'USD'): PaymentConversion {
  if (sourceCurrency === 'GHS') {
    return {
      amountUSD: null,
      amountGHS: amount,
      exchangeRate: 1,
      sourceCurrency: 'GHS',
      formattedUSD: formatCurrency(amount, 'GHS'),
      formattedGHS: formatCurrency(amount, 'GHS'),
    };
  }

  const amountGHS = convertUSDtoGHS(amount);

  return {
    amountUSD: amount,
    amountGHS,
    exchangeRate: EXCHANGE_RATES.USD_TO_GHS,
    sourceCurrency: 'USD',
    formattedUSD: formatCurrency(amount, 'USD'),
    formattedGHS: formatCurrency(amountGHS, 'GHS'),
  };
}
