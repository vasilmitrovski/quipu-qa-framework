import type { APIRequestContext } from '@playwright/test';
import { test as coreTest } from '@core/fixtures';
import type { NewCustomer } from '@core/data/customer.factory';
import { attachJson } from '@core/reporting/attach';
import { createApiClients, type ApiClients } from './index';
import type { Customer } from './schemas/customer.schema';
import type { Account } from './schemas/account.schema';

export interface SeededCustomer {
  credentials: Pick<NewCustomer, 'username' | 'password'>;
  profile: NewCustomer;
  customer: Customer;
  /** Accounts at creation time; ParaBank gives every new customer one funded CHECKING account. */
  accounts: Account[];
}

export interface AccountPair {
  /** The customer's original funded CHECKING account (balances re-read after setup). */
  from: Account;
  /** A SAVINGS account opened via the API for this test. */
  to: Account;
}

export interface ApiFixtures {
  apiContext: APIRequestContext;
  api: ApiClients;
  seededCustomer: SeededCustomer;
  accountPair: AccountPair;
}

export const test = coreTest.extend<ApiFixtures>({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext();
    await use(context);
    await context.dispose();
  },

  api: async ({ apiContext, region }, use, testInfo) => {
    const api = createApiClients(apiContext, region);
    await use(api);
    // Full API history on failure makes CI failures debuggable without re-running.
    if (testInfo.status !== testInfo.expectedStatus && api.client.calls.length) {
      await attachJson(testInfo, 'api-calls.json', api.client.calls);
    }
  },

  seededCustomer: async ({ api, data, log }, use) => {
    const profile = await api.customers.register(data.customer());
    const customer = await api.auth.loginOrThrow(profile.username, profile.password);
    const accounts = await api.accounts.listForCustomerOrThrow(customer.id);
    log.info('Seeded customer', { username: profile.username, customerId: customer.id });
    await use({
      credentials: { username: profile.username, password: profile.password },
      profile,
      customer,
      accounts,
    });
  },

  accountPair: async ({ api, seededCustomer }, use) => {
    const [checking] = seededCustomer.accounts;
    const savings = await api.accounts.createOrThrow(seededCustomer.customer.id, 'SAVINGS', checking.id);
    // Opening the account moved a deposit out of checking, so read both balances fresh.
    await use({
      from: await api.accounts.getOrThrow(checking.id),
      to: await api.accounts.getOrThrow(savings.id),
    });
  },
});

export { expect } from '@playwright/test';
