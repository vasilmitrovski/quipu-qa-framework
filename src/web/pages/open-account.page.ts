import { expect, type Locator, type Page } from '@playwright/test';
import type { AccountType } from '@api/schemas/account.schema';
import { accountTypeCode } from '@api/schemas/account.schema';
import { BasePage } from './base.page';

export class OpenAccountPage extends BasePage {
  protected readonly path = 'openaccount.htm';
  readonly accountType: Locator;
  readonly fromAccount: Locator;
  readonly submit: Locator;
  readonly result: Locator;
  readonly newAccountId: Locator;

  constructor(page: Page) {
    super(page);
    this.accountType = page.locator('#type');
    this.fromAccount = page.locator('#fromAccountId');
    this.submit = page.locator('input[type="button"][value="Open New Account"]');
    this.result = page.locator('#openAccountResult');
    this.newAccountId = page.locator('#newAccountId');
  }

  /** Opens an account and returns the new account id shown on the confirmation. */
  async open(type: Exclude<AccountType, 'LOAN'>, fromAccountId: number): Promise<number> {
    await expect(this.fromAccount.locator(`option[value="${fromAccountId}"]`)).toBeAttached();
    await this.accountType.selectOption(String(accountTypeCode[type]));
    await this.fromAccount.selectOption(String(fromAccountId));
    await this.submit.click();
    await expect(this.result).toBeVisible();
    return Number(await this.newAccountId.innerText());
  }
}
