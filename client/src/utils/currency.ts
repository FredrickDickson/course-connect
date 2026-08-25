/**
 * Client-side currency conversion utilities
 * Matches server-side conversion for consistency
 */

// Exchange rate for USD to GHS conversion (should match server)
const USD_TO_GHS_RATE = parseFloat(import.meta.env.VITE_USD_TO_GHS_RATE || "14.75");

/**
 * Convert USD amount to GHS
 * @param usdAmount - Amount in USD
 * @returns Amount in GHS (rounded to 2 decimal places)
 */
export function convertUSDtoGHS(usdAmount: number): number {
  if (usdAmount <= 0) return 0;
  const ghsAmount = usdAmount * USD_TO_GHS_RATE;
  return Math.round(ghsAmount * 100) / 100; // Round to 2 decimal places
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
    exchangeRate: USD_TO_GHS_RATE,
    sourceCurrency: 'USD',
    formattedUSD: formatCurrency(amount, 'USD'),
    formattedGHS: formatCurrency(amountGHS, 'GHS'),
  };
}
