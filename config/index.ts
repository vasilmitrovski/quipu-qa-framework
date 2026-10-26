import 'dotenv/config';
import { RegionConfigSchema, type RegionConfig } from './region.schema';
import { expectationsFor, type Expectations } from './expectations';
import { us } from './regions/us';
import { eu } from './regions/eu';
import { uk } from './regions/uk';
import { local } from './regions/local';

/** Registry of known regions. Adding a region = add a file + one entry here. */
export const regions: Record<string, RegionConfig> = { us, eu, uk, local };

/** A validated region plus the behaviour expected from the deployment it points at. */
export type ResolvedRegion = RegionConfig & { expectations: Expectations };

export function resolveRegion(name = process.env.REGION ?? 'us'): ResolvedRegion {
  const region = regions[name];
  if (!region) {
    throw new Error(`Unknown REGION "${name}". Known regions: ${Object.keys(regions).join(', ')}`);
  }
  // `||` not `??`: CI passes BASE_URL='' when no override applies.
  const merged = RegionConfigSchema.parse({ ...region, baseUrl: process.env.BASE_URL || region.baseUrl });
  return { ...merged, expectations: expectationsFor(merged.baseUrl) };
}

/** The region for this run, resolved once from the environment. */
export const config: ResolvedRegion = resolveRegion();

export type { RegionConfig, Expectations };
