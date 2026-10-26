import type { RegionConfig } from '../region.schema';

// Simulated region: same public ParaBank host, UK locale/currency/limits.
export const uk: RegionConfig = {
  name: 'uk',
  baseUrl: 'https://parabank.parasoft.com/parabank',
  apiPath: '/services/bank',
  locale: 'en-GB',
  currency: 'GBP',
  timezone: 'Europe/London',
  credentials: 'generate',
  limits: { minTransfer: 1, maxTransfer: 7_500 },
  featureFlags: { billPay: false, loans: true },
  // One worker: ParaBank writes are not concurrency-safe (PB-007) and the public demo is rate limited.
  throttling: { workers: 1, maxRetries: 4, baseDelayMs: 2_000 },
};
