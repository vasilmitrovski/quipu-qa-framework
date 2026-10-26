import { test, expect } from '@web/fixtures';

test.describe('Open new account (Web)', () => {
  test('account opened in the UI exists in the API', async ({ loggedInPage, openAccountPage, api, seededCustomer }) => {
    const [checking] = seededCustomer.accounts;

    await openAccountPage.goto();
    const newAccountId = await openAccountPage.open('SAVINGS', checking.id);

    expect(newAccountId).toBeGreaterThan(0);
    const created = await api.accounts.getOrThrow(newAccountId);
    expect(created.type).toBe('SAVINGS');
    expect(created.customerId).toBe(seededCustomer.customer.id);

    const accounts = await api.accounts.listForCustomerOrThrow(seededCustomer.customer.id);
    expect(accounts).toHaveLength(seededCustomer.accounts.length + 1);
    await expect(loggedInPage).toHaveURL(/openaccount\.htm/);
  });
});
