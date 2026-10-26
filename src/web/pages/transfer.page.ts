import { expect, type Locator, type Page } from '@playwright/test';
import { parseUiMoney } from '@core/utils/money';
import { BasePage } from './base.page';

export class TransferPage extends BasePage {
  protected readonly path = 'transfer.htm';
  readonly amount: Locator;
  readonly fromAccount: Locator;
  readonly toAccount: Locator;
  readonly submit: Locator;
  readonly result: Locator;
  readonly resultTitle: Locator;
  readonly amountResult: Locator;
  readonly fromResult: Locator;
  readonly toResult: Locator;

  constructor(page: Page) {
    super(page);
    this.amount = page.locator('#amount');
    this.fromAccount = page.locator('#fromAccountId');
    this.toAccount = page.locator('#toAccountId');
    this.submit = page.locator('input[type="submit"][value="Transfer"]');
    this.result = page.locator('#showResult');
    this.resultTitle = this.result.locator('h1.title');
    this.amountResult = page.locator('#amountResult');
    this.fromResult = page.locator('#fromAccountIdResult');
    this.toResult = page.locator('#toAccountIdResult');
  }

  async transfer(amount: number, fromAccountId: number, toAccountId: number): Promise<void> {
    // Account dropdowns are populated by AJAX after page load; wait for our options to exist.
    await expect(this.fromAccount.locator(`option[value="${fromAccountId}"]`)).toBeAttached();
    await expect(this.toAccount.locator(`option[value="${toAccountId}"]`)).toBeAttached();
    await this.amount.fill(amount.toFixed(2));
    await this.fromAccount.selectOption(String(fromAccountId));
    await this.toAccount.selectOption(String(toAccountId));
    await this.submit.click();
  }

  async confirmedAmount(): Promise<number> {
    await expect(this.result).toBeVisible();
    return parseUiMoney(await this.amountResult.innerText());
  }
}
