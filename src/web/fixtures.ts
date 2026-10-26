import type { Page } from '@playwright/test';
import { test as apiTest } from '@api/fixtures';
import { LoginPage } from './pages/login.page';
import { AccountsOverviewPage } from './pages/accounts-overview.page';
import { TransferPage } from './pages/transfer.page';
import { OpenAccountPage } from './pages/open-account.page';

export interface WebFixtures {
  loginPage: LoginPage;
  overviewPage: AccountsOverviewPage;
  transferPage: TransferPage;
  openAccountPage: OpenAccountPage;
  /** A page already logged in as `seededCustomer`, without going through the login UI. */
  loggedInPage: Page;
}

/** Web fixtures build on the API fixtures, so every Web test can seed and verify data via the API. */
export const test = apiTest.extend<WebFixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  overviewPage: async ({ page }, use) => use(new AccountsOverviewPage(page)),
  transferPage: async ({ page }, use) => use(new TransferPage(page)),
  openAccountPage: async ({ page }, use) => use(new OpenAccountPage(page)),

  loggedInPage: async ({ page, region, seededCustomer }, use) => {
    // page.request shares the browser context's cookie jar, so posting the login form
    // here gives the browser an authenticated session — no UI steps, no flakiness.
    const { maxRetries, baseDelayMs } = region.throttling;
    for (let attempt = 0; ; attempt++) {
      const response = await page.request.post(`${region.baseUrl}/login.htm`, {
        form: { username: seededCustomer.credentials.username, password: seededCustomer.credentials.password },
      });
      if (response.ok()) break;
      if (response.status() === 429 && attempt < maxRetries) {
        await page.waitForTimeout(Math.min(baseDelayMs * 2 ** attempt, 15_000));
        continue;
      }
      const hint = response.status() === 429 ? ' ([environment] rate limited by the host)' : '';
      throw new Error(`Programmatic login failed: ${response.status()}${hint}`);
    }
    await page.goto('overview.htm');
    await use(page);
  },
});

export { expect } from '@playwright/test';
