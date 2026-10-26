import type { RegionConfig } from '../region.schema';

// A genuinely separate deployment: ParaBank in Docker (`npm run parabank:up`, or a CI service container).
export const local: RegionConfig = {
  name: 'local',
  baseUrl: 'http://localhost:8080/parabank',
  apiPath: '/services/bank',
  locale: 'en-US',
  currency: 'USD',
  timezone: 'UTC',
  credentials: 'generate',
  limits: { minTransfer: 1, maxTransfer: 10_000 },
  featureFlags: { billPay: true, loans: true },
  // One worker: ParaBank writes are not concurrency-safe (PB-007). Parallelism comes from CI jobs.
  throttling: { workers: 1, maxRetries: 2, baseDelayMs: 500 },
};
