/**
 * Client-side currency conversion utilities
 * Matches server-side conversion for consistency
 */

// Exchange rate for USD to GHS conversion (should match server)
const USD_TO_GHS_RATE = 11; // Update this rate as needed

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
    exchangeRate: USD_TO_GHS_RATE,
    formattedUSD: formatCurrency(usdAmount, 'USD'),
    formattedGHS: formatCurrency(amountGHS, 'GHS'),
  };
}
