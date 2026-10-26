import { test, expect } from '@web/fixtures';
import { toCents } from '@core/utils/money';

test.describe('Transfer funds (Web)', () => {
  test('UI transfer is reflected in the API @smoke', async ({ loggedInPage, transferPage, api, accountPair, data }) => {
    // Setup through the API: a second account exists before the browser ever opens the form.
    const { from, to } = accountPair;
    const amount = data.transferAmount();

    await transferPage.goto();
    await transferPage.transfer(amount, from.id, to.id);

    await expect(transferPage.resultTitle).toHaveText('Transfer Complete!');
    expect(await transferPage.confirmedAmount()).toBeCloseTo(amount, 2);
    await expect(transferPage.fromResult).toHaveText(String(from.id));
    await expect(transferPage.toResult).toHaveText(String(to.id));

    // Verification through the API: the backend state matches what the UI claimed.
    const fromAfter = await api.accounts.getOrThrow(from.id);
    const toAfter = await api.accounts.getOrThrow(to.id);
    expect(toCents(fromAfter.balance)).toBe(toCents(from.balance - amount));
    expect(toCents(toAfter.balance)).toBe(toCents(to.balance + amount));
    expect(loggedInPage.url()).toContain('transfer.htm');
  });

  test('accounts overview shows the balances the API reports', async ({ loggedInPage, overviewPage, accountPair }) => {
    await overviewPage.goto();

    expect(toCents(await overviewPage.balanceOf(accountPair.from.id))).toBe(toCents(accountPair.from.balance));
    expect(toCents(await overviewPage.balanceOf(accountPair.to.id))).toBe(toCents(accountPair.to.balance));
    await expect(loggedInPage).toHaveURL(/overview\.htm/);
  });

  test('idempotency: reloading after a transfer does not repeat it @idempotency', async ({ loggedInPage, transferPage, api, accountPair }) => {
    const { from, to } = accountPair;
    const amount = 5.55;

    await transferPage.goto();
    await transferPage.transfer(amount, from.id, to.id);
    await expect(transferPage.result).toBeVisible();

    await loggedInPage.reload();
    await loggedInPage.goBack().catch(() => undefined);
    await loggedInPage.goForward().catch(() => undefined);

    const debits = (await api.accounts.transactionsOrThrow(from.id)).filter(
      (t) => t.type === 'Debit' && toCents(t.amount) === toCents(amount),
    );
    expect(debits).toHaveLength(1);
    expect(toCents((await api.accounts.getOrThrow(from.id)).balance)).toBe(toCents(from.balance - amount));
  });
});
