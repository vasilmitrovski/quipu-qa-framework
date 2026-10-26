import type { Locator, Page } from '@playwright/test';

/** Left-hand "Account Services" menu shown once a customer is logged in. */
export class NavPanel {
  readonly root: Locator;
  readonly welcome: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#leftPanel');
    this.welcome = this.root.locator('.smallText');
  }

  link(name: 'Open New Account' | 'Accounts Overview' | 'Transfer Funds' | 'Log Out'): Locator {
    return this.root.getByRole('link', { name });
  }

  async logOut(): Promise<void> {
    await this.link('Log Out').click();
  }
}
