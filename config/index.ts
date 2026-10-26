import 'dotenv/config';
import { RegionConfigSchema, type RegionConfig } from './region.schema';
import { us } from './regions/us';
import { eu } from './regions/eu';
import { uk } from './regions/uk';
import { local } from './regions/local';

/** Registry of known regions. Adding a region = add a file + one entry here. */
export const regions: Record<string, RegionConfig> = { us, eu, uk, local };

export function resolveRegion(name = process.env.REGION ?? 'us'): RegionConfig {
  const region = regions[name];
  if (!region) {
    throw new Error(`Unknown REGION "${name}". Known regions: ${Object.keys(regions).join(', ')}`);
  }
  // `||` not `??`: CI passes BASE_URL='' when no override applies.
  const merged = { ...region, baseUrl: process.env.BASE_URL || region.baseUrl };
  return RegionConfigSchema.parse(merged);
}

/** The region for this run, resolved once from the environment. */
export const config: RegionConfig = resolveRegion();

export type { RegionConfig };
