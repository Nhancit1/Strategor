export const CURRENCIES = [
  { code: 'MAD', symbol: 'MAD', label: 'Dirham (MAD)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'USD', symbol: '$', label: 'Dollar ($)' },
];

// Profiles saved before the currency field existed were analysed in euros.
const LEGACY_CURRENCY = 'EUR';

// Revenue buckets per currency. Same index = same order of magnitude, so switching
// currency maps the selected bucket to its equivalent instead of losing it.
export const REVENUE_RANGES = {
  EUR: ['<500k', '500k-2M', '2-10M', '10-50M', '50-250M', '>250M'],
  USD: ['<500k', '500k-2M', '2-10M', '10-50M', '50-250M', '>250M'],
  MAD: ['<5M', '5-20M', '20-100M', '100-500M', '500M-2,5Md', '>2,5Md'],
};

export const currencyOf = (profile) => profile?.currency || LEGACY_CURRENCY;

export const currencySymbol = (code) =>
  CURRENCIES.find((c) => c.code === code)?.symbol || code;

export function mapRevenueRange(range, from, to) {
  const i = (REVENUE_RANGES[from] || []).indexOf(range);
  return i >= 0 ? REVENUE_RANGES[to][i] : null;
}
