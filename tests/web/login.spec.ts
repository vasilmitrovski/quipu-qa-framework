import { test, expect } from '@web/fixtures';
import { knownIssue } from '@core/reporting/attach';

test.describe('Login (Web)', () => {
  test('customer logs in and sees the accounts overview @smoke', async ({ loginPage, overviewPage, seededCustomer, page }) => {
    const { username, password } = seededCustomer.credentials;
    const [checking] = seededCustomer.accounts;

    await loginPage.goto();
    await loginPage.login(username, password);

    await expect(page).toHaveURL(/overview\.htm/);
    await expect(overviewPage.title).toHaveText('Accounts Overview');
    await expect(overviewPage.nav.welcome).toContainText(
      `${seededCustomer.profile.firstName} ${seededCustomer.profile.lastName}`,
    );
    await expect(overviewPage.row(checking.id)).toBeVisible();
  });

  test('wrong password shows an error and stays logged out', async ({ loginPage, seededCustomer }) => {
    await loginPage.goto();
    await loginPage.login(seededCustomer.credentials.username, 'definitely-wrong');

    await expect(loginPage.error).toContainText('could not be verified');
    await expect(loginPage.nav.link('Log Out')).toHaveCount(0);
  });

  test('edge: submitting empty credentials shows a validation error @edge', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.submit.click();

    await expect(loginPage.error).toContainText('Please enter a username and password');
  });

  test('logging out ends the session', async ({ loggedInPage, overviewPage, loginPage }, testInfo) => {
    knownIssue(testInfo, 'PB-005', 'Protected pages return HTTP 500 instead of redirecting to login');
    await overviewPage.nav.logOut();
    await expect(loginPage.username).toBeVisible();

    // Going back to a protected page must not show account data (the security-relevant part).
    await loggedInPage.goto('overview.htm');
    await expect(overviewPage.table).toHaveCount(0);
  });
});
