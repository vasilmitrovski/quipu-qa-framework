import type { RegionConfig } from '../region.schema';

export const us: RegionConfig = {
  name: 'us',
  baseUrl: 'https://parabank.parasoft.com/parabank',
  apiPath: '/services/bank',
  locale: 'en-US',
  currency: 'USD',
  timezone: 'America/New_York',
  credentials: 'generate',
  limits: { minTransfer: 1, maxTransfer: 10_000 },
  featureFlags: { billPay: true, loans: true },
  // One worker: ParaBank writes are not concurrency-safe (PB-007) and the public demo is rate limited.
  throttling: { workers: 1, maxRetries: 4, baseDelayMs: 2_000 },
};
