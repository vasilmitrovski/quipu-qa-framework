import type { RegionConfig } from '@config';

/** A small, valid transfer amount inside the region's limits, with cents to exercise decimal handling. */
export function validTransferAmount(region: RegionConfig): number {
  const amount = region.limits.minTransfer + 10 + Math.floor(Math.random() * 40) + 0.25;
  return Math.min(amount, region.limits.maxTransfer);
}
