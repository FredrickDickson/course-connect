/**
 * Country Classification Service
 * World Bank income classification mappings
 */

import type { IncomeTier } from './renewal-pricing';

export interface CountryInfo {
  code: string;
  name: string;
  incomeTier: IncomeTier;
  region: string;
}

/**
 * High-Income Countries (World Bank classification)
 */
export const HIGH_INCOME_COUNTRIES: string[] = [
  // North America
  'US', 'CA',
  // Europe
  'GB', 'IE', 'DE', 'FR', 'NL', 'BE', 'LU', 'CH', 'AT', 'IT', 'ES', 'PT',
  'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'SI', 'EE', 'LV', 'LT',
  'GR', 'CY', 'MT',
  // Middle East
  'AE', 'QA', 'KW', 'SA', 'IL', 'BH', 'OM',
  // Asia-Pacific
  'SG', 'JP', 'KR', 'AU', 'NZ', 'HK', 'TW'
];

/**
 * Lower-Middle-Income Countries (World Bank classification)
 */
export const LOWER_MIDDLE_INCOME_COUNTRIES: string[] = [
  // Africa
  'GH', 'NG', 'KE', 'ZA', 'EG', 'MA', 'DZ', 'TN', 'ET', 'UG', 'TZ', 'ZM',
  'ZW', 'MW', 'MZ', 'BW', 'NA', 'RW', 'SN', 'CI', 'CM', 'NE', 'TD', 'CF',
  'BI', 'SS', 'SL', 'LR', 'TG', 'BJ', 'BF',
  // Asia
  'IN', 'PK', 'BD', 'VN', 'PH', 'ID', 'LK', 'NP', 'AF', 'KH', 'LA', 'MM',
  // Latin America & Caribbean
  'BR', 'MX', 'AR', 'CO', 'PE', 'CL', 'EC', 'BO', 'PY', 'DO', 'JM'
];

/**
 * Country code to name mapping
 */
export const COUNTRY_NAMES: Record<string, string> = {
  // High-Income
  'US': 'United States',
  'CA': 'Canada',
  'GB': 'United Kingdom',
  'IE': 'Ireland',
  'DE': 'Germany',
  'FR': 'France',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'LU': 'Luxembourg',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'IT': 'Italy',
  'ES': 'Spain',
  'PT': 'Portugal',
  'DK': 'Denmark',
  'SE': 'Sweden',
  'NO': 'Norway',
  'FI': 'Finland',
  'IS': 'Iceland',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'EE': 'Estonia',
  'LV': 'Latvia',
  'LT': 'Lithuania',
  'GR': 'Greece',
  'CY': 'Cyprus',
  'MT': 'Malta',
  'AE': 'United Arab Emirates',
  'QA': 'Qatar',
  'KW': 'Kuwait',
  'SA': 'Saudi Arabia',
  'IL': 'Israel',
  'BH': 'Bahrain',
  'OM': 'Oman',
  'SG': 'Singapore',
  'JP': 'Japan',
  'KR': 'South Korea',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'HK': 'Hong Kong',
  'TW': 'Taiwan',
  // Lower-Middle-Income (Africa)
  'GH': 'Ghana',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'MA': 'Morocco',
  'DZ': 'Algeria',
  'TN': 'Tunisia',
  'ET': 'Ethiopia',
  'UG': 'Uganda',
  'TZ': 'Tanzania',
  'ZM': 'Zambia',
  'ZW': 'Zimbabwe',
  'MW': 'Malawi',
  'MZ': 'Mozambique',
  'BW': 'Botswana',
  'NA': 'Namibia',
  'RW': 'Rwanda',
  'SN': 'Senegal',
  'CI': 'Ivory Coast',
  'CM': 'Cameroon',
  'NE': 'Niger',
  'TD': 'Chad',
  'CF': 'Central African Republic',
  'BI': 'Burundi',
  'SS': 'South Sudan',
  'SL': 'Sierra Leone',
  'LR': 'Liberia',
  'TG': 'Togo',
  'BJ': 'Benin',
  'BF': 'Burkina Faso',
  // Lower-Middle-Income (Asia)
  'IN': 'India',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'VN': 'Vietnam',
  'PH': 'Philippines',
  'ID': 'Indonesia',
  'LK': 'Sri Lanka',
  'NP': 'Nepal',
  'AF': 'Afghanistan',
  'KH': 'Cambodia',
  'LA': 'Laos',
  'MM': 'Myanmar',
  // Lower-Middle-Income (Latin America)
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CO': 'Colombia',
  'PE': 'Peru',
  'CL': 'Chile',
  'EC': 'Ecuador',
  'BO': 'Bolivia',
  'PY': 'Paraguay',
  'DO': 'Dominican Republic',
  'JM': 'Jamaica'
};

/**
 * Get income tier for a country code
 * Defaults to LOWER_MIDDLE_INCOME for unknown countries (concessionary approach)
 */
export function getIncomeTier(countryCode: string): IncomeTier {
  const code = countryCode.toUpperCase();
  
  if (HIGH_INCOME_COUNTRIES.includes(code)) {
    return 'HIGH_INCOME';
  }
  
  if (LOWER_MIDDLE_INCOME_COUNTRIES.includes(code)) {
    return 'LOWER_MIDDLE_INCOME';
  }
  
  // Default to concessionary tier for unknown countries
  return 'LOWER_MIDDLE_INCOME';
}

/**
 * Get country information
 */
export function getCountryInfo(countryCode: string): CountryInfo {
  const code = countryCode.toUpperCase();
  const incomeTier = getIncomeTier(code);
  const name = COUNTRY_NAMES[code] || code;
  
  // Determine region
  let region = 'Other';
  if (['US', 'CA'].includes(code)) region = 'North America';
  else if (['GB', 'IE', 'DE', 'FR', 'NL', 'BE', 'LU', 'CH', 'AT', 'IT', 'ES', 'PT', 'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'SI', 'EE', 'LV', 'LT', 'GR', 'CY', 'MT'].includes(code)) region = 'Europe';
  else if (['AE', 'QA', 'KW', 'SA', 'IL', 'BH', 'OM'].includes(code)) region = 'Middle East';
  else if (['SG', 'JP', 'KR', 'AU', 'NZ', 'HK', 'TW'].includes(code)) region = 'Asia-Pacific';
  else if (['GH', 'NG', 'KE', 'ZA', 'EG', 'MA', 'DZ', 'TN', 'ET', 'UG', 'TZ', 'ZM', 'ZW', 'MW', 'MZ', 'BW', 'NA', 'RW', 'SN', 'CI', 'CM', 'NE', 'TD', 'CF', 'BI', 'SS', 'SL', 'LR', 'TG', 'BJ', 'BF'].includes(code)) region = 'Africa';
  else if (['IN', 'PK', 'BD', 'VN', 'PH', 'ID', 'LK', 'NP', 'AF', 'KH', 'LA', 'MM'].includes(code)) region = 'Asia';
  else if (['BR', 'MX', 'AR', 'CO', 'PE', 'CL', 'EC', 'BO', 'PY', 'DO', 'JM'].includes(code)) region = 'Latin America';
  
  return {
    code,
    name,
    incomeTier,
    region
  };
}

/**
 * Check if a country is in a specific tier
 */
export function isHighIncome(countryCode: string): boolean {
  return getIncomeTier(countryCode) === 'HIGH_INCOME';
}

export function isLowerMiddleIncome(countryCode: string): boolean {
  return getIncomeTier(countryCode) === 'LOWER_MIDDLE_INCOME';
}

/**
 * Get all countries in a tier
 */
export function getCountriesByTier(tier: IncomeTier): string[] {
  if (tier === 'HIGH_INCOME') {
    return HIGH_INCOME_COUNTRIES;
  }
  return LOWER_MIDDLE_INCOME_COUNTRIES;
}

/**
 * Validate country code format (ISO 3166-1 alpha-2)
 */
export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/i.test(code);
}
