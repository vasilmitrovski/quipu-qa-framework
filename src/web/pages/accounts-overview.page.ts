import { expect, type Locator, type Page } from '@playwright/test';
import { parseUiMoney } from '@core/utils/money';
import { BasePage } from './base.page';

export class AccountsOverviewPage extends BasePage {
  protected readonly path = 'overview.htm';
  readonly table: Locator;

  constructor(page: Page) {
    super(page);
    this.table = page.locator('#accountTable');
  }

  /** Row for an account. The table is filled by AJAX, so callers should await visibility. */
  row(accountId: number): Locator {
    return this.table.locator('tbody tr').filter({ has: this.page.getByRole('link', { name: String(accountId), exact: true }) });
  }

  async balanceOf(accountId: number): Promise<number> {
    const row = this.row(accountId);
    await expect(row).toBeVisible();
    return parseUiMoney(await row.locator('td').nth(1).innerText());
  }
}
