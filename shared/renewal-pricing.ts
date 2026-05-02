/**
 * Renewal Pricing Service
 * Handles tiered pricing based on World Bank income classifications
 */

export type IncomeTier = 'HIGH_INCOME' | 'LOWER_MIDDLE_INCOME';
export type MembershipLevel = 'ASSOCIATE' | 'MEMBER' | 'FELLOW';
export type Currency = 'GBP' | 'USD' | 'GHS';

export interface RenewalPrice {
  baseAmount: number;
  currency: Currency;
  lateSurcharge: number;
  totalAmount: number;
  discountAmount: number;
  discountPercentage: number;
  isLate: boolean;
}

export interface PricingConfig {
  incomeTier: IncomeTier;
  membershipLevel: MembershipLevel;
  currency: Currency;
  baseAmount: number;
  lateSurchargePercentage: number;
}

/**
 * Default pricing configuration (fallback if database unavailable)
 */
export const DEFAULT_PRICING: Record<IncomeTier, Record<MembershipLevel, Record<Currency, number>>> = {
  HIGH_INCOME: {
    ASSOCIATE: { GBP: 65, USD: 85, GHS: 0 },
    MEMBER: { GBP: 65, USD: 85, GHS: 0 },
    FELLOW: { GBP: 65, USD: 85, GHS: 0 }
  },
  LOWER_MIDDLE_INCOME: {
    ASSOCIATE: { GBP: 46, USD: 61, GHS: 660 },
    MEMBER: { GBP: 46, USD: 61, GHS: 660 },
    FELLOW: { GBP: 46, USD: 61, GHS: 660 }
  }
};

export const LATE_SURCHARGE_PERCENTAGE = 15;

/**
 * Get available currencies for an income tier
 */
export function getAvailableCurrencies(incomeTier: IncomeTier): Currency[] {
  if (incomeTier === 'HIGH_INCOME') {
    return ['GBP', 'USD'];
  }
  return ['GBP', 'USD', 'GHS'];
}

/**
 * Get default currency for a country code
 */
export function getDefaultCurrency(countryCode: string): Currency {
  const lowerMiddleCountries = ['GH', 'NG', 'KE', 'ZA', 'EG', 'MA', 'DZ', 'TN', 'ET', 'UG', 'TZ', 'ZM', 'ZW', 'MW', 'MZ', 'BW', 'NA', 'RW', 'SN', 'CI', 'CM', 'NE', 'TD', 'CF', 'BI', 'SS', 'SL', 'LR', 'TG', 'BJ', 'BF', 'IN', 'PK', 'BD', 'VN', 'PH', 'ID', 'LK', 'NP', 'AF', 'KH', 'LA', 'MM', 'BR', 'MX', 'AR', 'CO', 'PE', 'CL', 'EC', 'BO', 'PY', 'DO', 'JM'];
  
  if (countryCode === 'GH') return 'GHS';
  if (lowerMiddleCountries.includes(countryCode)) return 'USD';
  return 'USD';
}

/**
 * Calculate renewal price with surcharges and discounts
 */
export function calculateRenewalPrice(
  incomeTier: IncomeTier,
  membershipLevel: MembershipLevel,
  currency: Currency,
  isLate: boolean = false,
  discountPercentage: number = 0
): RenewalPrice {
  // Get base price
  const baseAmount = DEFAULT_PRICING[incomeTier]?.[membershipLevel]?.[currency];
  
  if (baseAmount === undefined || baseAmount === 0) {
    throw new Error(`No pricing available for ${incomeTier} ${membershipLevel} in ${currency}`);
  }

  // Calculate late surcharge
  const lateSurcharge = isLate ? baseAmount * (LATE_SURCHARGE_PERCENTAGE / 100) : 0;

  // Calculate discount
  const discountAmount = baseAmount * (discountPercentage / 100);

  // Calculate total
  const totalAmount = baseAmount + lateSurcharge - discountAmount;

  return {
    baseAmount,
    currency,
    lateSurcharge,
    totalAmount,
    discountAmount,
    discountPercentage,
    isLate
  };
}

/**
 * Check if renewal is late based on anniversary date
 * Late if more than 30 days past anniversary
 */
export function isRenewalLate(anniversaryDate: Date): boolean {
  const today = new Date();
  const anniversary = new Date(anniversaryDate);
  
  // Set anniversary to current year
  anniversary.setFullYear(today.getFullYear());
  
  // If anniversary hasn't occurred this year yet, check last year
  if (anniversary > today) {
    anniversary.setFullYear(today.getFullYear() - 1);
  }
  
  const daysPast = Math.floor((today.getTime() - anniversary.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysPast > 30;
}

/**
 * Get days until renewal deadline
 */
export function getDaysUntilDeadline(anniversaryDate: Date): number {
  const today = new Date();
  const anniversary = new Date(anniversaryDate);
  
  // Set anniversary to current year
  anniversary.setFullYear(today.getFullYear());
  
  // If anniversary has passed this year, use next year
  if (anniversary < today) {
    anniversary.setFullYear(today.getFullYear() + 1);
  }
  
  return Math.ceil((anniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    GBP: '£',
    USD: '$',
    GHS: '₵'
  };
  
  return `${symbols[currency]}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get discount tier based on member count
 */
export function getDiscountTier(memberCount: number): { percentage: number; tier: string } {
  if (memberCount >= 10) {
    return { percentage: 15, tier: '15_PERCENT' };
  }
  if (memberCount >= 5) {
    return { percentage: 10, tier: '10_PERCENT' };
  }
  return { percentage: 0, tier: 'NONE' };
}
