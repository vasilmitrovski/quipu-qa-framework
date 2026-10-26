import { test, expect } from '@api/fixtures';
import { knownIssue } from '@core/reporting/attach';
import { formatMoney, toCents } from '@core/utils/money';

test.describe('Transfer API', () => {
  test('transfer moves money between accounts @smoke', async ({ api, accountPair, data, region }) => {
    const amount = data.transferAmount();
    const { from, to } = accountPair;

    const response = await api.transfers.transfer(from.id, to.id, amount);

    expect(response.status, `transfer of ${formatMoney(amount, region)}`).toBe(200);
    expect(response.text).toMatch(/successfully transferred/i);

    const fromAfter = await api.accounts.getOrThrow(from.id);
    const toAfter = await api.accounts.getOrThrow(to.id);
    expect(toCents(fromAfter.balance)).toBe(toCents(from.balance - amount));
    expect(toCents(toAfter.balance)).toBe(toCents(to.balance + amount));

    const debits = (await api.accounts.transactionsOrThrow(from.id)).filter((t) => t.type === 'Debit');
    const credits = (await api.accounts.transactionsOrThrow(to.id)).filter((t) => t.type === 'Credit');
    expect(debits.some((t) => toCents(t.amount) === toCents(amount))).toBe(true);
    expect(credits.some((t) => toCents(t.amount) === toCents(amount))).toBe(true);
  });

  test('transfer to a non-existent account fails and leaves the balance unchanged', async ({ api, accountPair }) => {
    const { from } = accountPair;

    const response = await api.transfers.transfer(from.id, 999_999_999, 10);

    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
    const fromAfter = await api.accounts.getOrThrow(from.id);
    expect(toCents(fromAfter.balance)).toBe(toCents(from.balance));
  });

  test('edge: a one-cent transfer keeps exact decimal precision @edge', async ({ api, accountPair }) => {
    const { from, to } = accountPair;

    (await api.transfers.transfer(from.id, to.id, 0.01)).ensureOk();

    const fromAfter = await api.accounts.getOrThrow(from.id);
    const toAfter = await api.accounts.getOrThrow(to.id);
    expect(toCents(from.balance) - toCents(fromAfter.balance)).toBe(1);
    expect(toCents(toAfter.balance) - toCents(to.balance)).toBe(1);
  });

  test('idempotency: repeating a transfer request applies it twice @idempotency', async ({ api, accountPair }, testInfo) => {
    knownIssue(testInfo, 'PB-003', 'POST /transfer has no idempotency key; retries double-charge');
    const { from, to } = accountPair;
    const amount = 7.77;

    // Simulates a client retry after a timeout: same request, sent twice.
    (await api.transfers.transfer(from.id, to.id, amount)).ensureOk();
    (await api.transfers.transfer(from.id, to.id, amount)).ensureOk();

    const fromAfter = await api.accounts.getOrThrow(from.id);
    const matchingDebits = (await api.accounts.transactionsOrThrow(from.id)).filter(
      (t) => t.type === 'Debit' && toCents(t.amount) === toCents(amount),
    );
    // Documents current behaviour: no de-duplication. A payments API should accept an
    // Idempotency-Key and return the original result for the retry.
    expect(matchingDebits).toHaveLength(2);
    expect(toCents(fromAfter.balance)).toBe(toCents(from.balance - 2 * amount));
  });

  test('edge: a negative amount is rejected @edge', async ({ api, accountPair }, testInfo) => {
    knownIssue(testInfo, 'PB-001', 'Negative transfer amounts are accepted and reverse the money flow');
    test.fail(true, 'PB-001: ParaBank accepts negative transfer amounts');
    const { from, to } = accountPair;

    const response = await api.transfers.transfer(from.id, to.id, -25);

    expect(response.ok).toBe(false);
    const toAfter = await api.accounts.getOrThrow(to.id);
    expect(toCents(toAfter.balance)).toBe(toCents(to.balance));
  });

  test('edge: a transfer larger than the balance is rejected @edge', async ({ api, accountPair }, testInfo) => {
    knownIssue(testInfo, 'PB-002', 'Transfers exceeding the available balance are accepted (overdraft)');
    test.fail(true, 'PB-002: ParaBank allows overdrawing an account via transfer');
    const { from, to } = accountPair;

    const response = await api.transfers.transfer(from.id, to.id, from.balance + 1_000);

    expect(response.ok).toBe(false);
    const fromAfter = await api.accounts.getOrThrow(from.id);
    expect(fromAfter.balance).toBeGreaterThanOrEqual(0);
  });
});
