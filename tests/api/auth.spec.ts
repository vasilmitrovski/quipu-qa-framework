import { test, expect } from '@api/fixtures';
import { CustomerSchema } from '@api/index';
import { knownIssue } from '@core/reporting/attach';

test.describe('Auth API', () => {
  test('login returns the registered customer @smoke', async ({ api, seededCustomer }) => {
    const { username, password } = seededCustomer.credentials;

    const response = await api.auth.login(username, password);

    expect(response.status).toBe(200);
    const customer = response.parse(CustomerSchema);
    expect(customer.id).toBe(seededCustomer.customer.id);
    expect(customer.firstName).toBe(seededCustomer.profile.firstName);
    expect(customer.lastName).toBe(seededCustomer.profile.lastName);
  });

  test('login with a wrong password is rejected', async ({ api, seededCustomer }) => {
    const response = await api.auth.login(seededCustomer.credentials.username, 'definitely-wrong');

    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect.soft(response.text).toMatch(/invalid username and\/or password/i);
  });

  for (const field of ['username', 'phoneNumber'] as const) {
    test(`edge: a ${field} longer than 20 characters gets an accurate error`, async ({ api, data }, testInfo) => {
      knownIssue(testInfo, 'PB-006', `${field} over 20 chars is rejected as "This username already exists"`);
      test.fail(true, 'PB-006: over-length values get a misleading "already exists" error');
      const unique = Date.now().toString(36).slice(-6);
      const tooLong = field === 'username'
        ? data.customer({ username: `q${'x'.repeat(14)}${unique}` })
        : data.customer({ phoneNumber: '1-555-555-5555 x12345' });

      // Registration must fail (it does) — but the reason given must be the real one.
      await expect(api.customers.register(tooLong, 1)).rejects.toThrow(/too long|maximum|20 characters/i);
    });
  }

  test('login for an unknown user is rejected', async ({ api, data }) => {
    const nobody = data.customer();

    const response = await api.auth.login(nobody.username, nobody.password);

    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
