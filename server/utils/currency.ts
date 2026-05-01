/**
 * Currency conversion utilities
 * Handles USD to GHS conversion for Paystack Ghana integration
 */

export interface ExchangeRates {
  USD_TO_GHS: number;
}

// Exchange rate from environment variable
const usdToGhsRate = parseFloat(process.env.USD_TO_GHS_RATE || "15.50");

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
  amountUSD: number;
  amountGHS: number;
  exchangeRate: number;
  formattedUSD: string;
  formattedGHS: string;
}

/**
 * Convert payment amount with full details
 * @param usdAmount - Amount in USD
 * @returns Complete conversion details
 */
export function convertPayment(usdAmount: number): PaymentConversion {
  const amountGHS = convertUSDtoGHS(usdAmount);
  
  return {
    amountUSD: usdAmount,
    amountGHS,
    exchangeRate: EXCHANGE_RATES.USD_TO_GHS,
    formattedUSD: formatCurrency(usdAmount, 'USD'),
    formattedGHS: formatCurrency(amountGHS, 'GHS'),
  };
}
