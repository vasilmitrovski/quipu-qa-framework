import { test as base } from '@playwright/test';
import { config, type ResolvedRegion } from '@config';
import { createLogger, type Logger } from './logger';
import { buildCustomer, type NewCustomer } from './data/customer.factory';
import { validTransferAmount } from './data/transfer.factory';

export interface DataFactory {
  customer(overrides?: Partial<NewCustomer>): NewCustomer;
  transferAmount(): number;
}

export interface CoreFixtures {
  region: ResolvedRegion;
  log: Logger;
  data: DataFactory;
}

/** Base fixtures shared by every layer (API, Web, and later Mobile). No layer-specific imports here. */
export const test = base.extend<CoreFixtures>({
  region: async ({}, use) => {
    await use(config);
  },
  log: async ({ region }, use, testInfo) => {
    await use(createLogger(region.name, testInfo.title));
  },
  data: async ({ region }, use) => {
    await use({
      customer: (overrides) => buildCustomer(region, overrides),
      transferAmount: () => validTransferAmount(region),
    });
  },
});

export { expect } from '@playwright/test';
