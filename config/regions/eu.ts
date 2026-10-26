import type { RegionConfig } from '../region.schema';

// Simulated region: same public ParaBank host, EU locale/currency/limits.
export const eu: RegionConfig = {
  name: 'eu',
  baseUrl: 'https://parabank.parasoft.com/parabank',
  apiPath: '/services/bank',
  locale: 'de-DE',
  currency: 'EUR',
  timezone: 'Europe/Berlin',
  credentials: 'generate',
  limits: { minTransfer: 1, maxTransfer: 5_000 },
  featureFlags: { billPay: true, loans: false },
  // One worker: ParaBank writes are not concurrency-safe (PB-007) and the public demo is rate limited.
  throttling: { workers: 1, maxRetries: 4, baseDelayMs: 2_000 },
};
