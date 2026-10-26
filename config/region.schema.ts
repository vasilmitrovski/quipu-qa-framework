import { z } from 'zod';

/**
 * Shape every region file must satisfy. Validated once at startup so a typo in a
 * region file fails the run immediately instead of producing confusing test failures.
 */
export const RegionConfigSchema = z.object({
  name: z.string().min(1),
  /** Root of the ParaBank web app, e.g. https://parabank.parasoft.com/parabank */
  baseUrl: z.string().url(),
  /** REST API path relative to baseUrl */
  apiPath: z.string().startsWith('/'),
  /** BCP-47 locale used for generated test data and money formatting */
  locale: z.string().min(2),
  /** ISO-4217 currency code */
  currency: z.string().length(3),
  timezone: z.string().min(1),
  /** 'generate' registers a fresh customer per test; fixed credentials are for stable environments */
  credentials: z.union([
    z.literal('generate'),
    z.object({ username: z.string().min(1), password: z.string().min(1) }),
  ]),
  limits: z.object({
    minTransfer: z.number().positive(),
    maxTransfer: z.number().positive(),
  }),
  featureFlags: z.object({
    billPay: z.boolean(),
    loans: z.boolean(),
  }),
  /**
   * How hard this deployment may be driven. Shared/public hosts sit behind rate limiting,
   * so they get few workers and retries on 429/503; an isolated deployment can run wide open.
   */
  throttling: z.object({
    workers: z.number().int().positive(),
    maxRetries: z.number().int().min(0),
    baseDelayMs: z.number().int().positive(),
  }),
});

export type RegionConfig = z.infer<typeof RegionConfigSchema>;
