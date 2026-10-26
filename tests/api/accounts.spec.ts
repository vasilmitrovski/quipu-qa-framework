import { test, expect } from '@api/fixtures';
import {
  AccountListSchema,
  AccountSchema,
  CustomerSchema,
  TransactionListSchema,
} from '@api/index';
import { knownIssue } from '@core/reporting/attach';
import { toCents } from '@core/utils/money';

test.describe('Accounts API', () => {
  test('new customer gets one funded checking account @smoke', async ({ api, seededCustomer }) => {
    const accounts = await api.accounts.listForCustomerOrThrow(seededCustomer.customer.id);

    expect(accounts).toHaveLength(1);
    expect(accounts[0].type).toBe('CHECKING');
    expect(accounts[0].customerId).toBe(seededCustomer.customer.id);
    expect(accounts[0].balance).toBeGreaterThan(0);
  });

  test('responses match the published contract (schema validation) @smoke', async ({ api, seededCustomer, accountPair }) => {
    const customerId = seededCustomer.customer.id;

    // parse() throws with a field-by-field report if any response drifts from the schema.
    const customer = (await api.customers.get(customerId)).ensureOk().parse(CustomerSchema);
    const accounts = (await api.accounts.listForCustomer(customerId)).ensureOk().parse(AccountListSchema);
    const account = (await api.accounts.get(accountPair.to.id)).ensureOk().parse(AccountSchema);
    const transactions = (await api.accounts.transactions(accountPair.to.id)).ensureOk().parse(TransactionListSchema);

    expect(customer.id).toBe(customerId);
    expect(accounts.map((a) => a.id)).toEqual(expect.arrayContaining([accountPair.from.id, accountPair.to.id]));
    expect(account.type).toBe('SAVINGS');
    // Opening the account funds it with a deposit, which must appear as a credit.
    expect(transactions.some((t) => t.type === 'Credit')).toBe(true);
  });

  test('opening an account moves the deposit out of the source account', async ({ api, seededCustomer }) => {
    const [checking] = seededCustomer.accounts;

    const created = await api.accounts.createOrThrow(seededCustomer.customer.id, 'CHECKING', checking.id);
    // Re-read: the createAccount response itself reports a stale balance (PB-004).
    const newAccount = await api.accounts.getOrThrow(created.id);
    const sourceAfter = await api.accounts.getOrThrow(checking.id);

    expect(created.type).toBe('CHECKING');
    expect(created.customerId).toBe(seededCustomer.customer.id);
    expect(newAccount.balance).toBeGreaterThan(0);
    expect(toCents(sourceAfter.balance)).toBe(toCents(checking.balance - newAccount.balance));
  });

  test('createAccount response reports the funded balance', async ({ api, seededCustomer }, testInfo) => {
    knownIssue(testInfo, 'PB-004', 'createAccount returns balance 0 although the account is funded');
    test.fail(true, 'PB-004: createAccount response returns a stale balance of 0');
    const [checking] = seededCustomer.accounts;

    const created = await api.accounts.createOrThrow(seededCustomer.customer.id, 'SAVINGS', checking.id);
    const stored = await api.accounts.getOrThrow(created.id);

    expect(created.balance).toBe(stored.balance);
  });

  test('reading an account is idempotent', async ({ api, accountPair }) => {
    const first = await api.accounts.getOrThrow(accountPair.from.id);
    const second = await api.accounts.getOrThrow(accountPair.from.id);
    const third = await api.accounts.getOrThrow(accountPair.from.id);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  test('requesting an unknown account returns an error', async ({ api }) => {
    const response = await api.accounts.get(999_999_999);

    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
