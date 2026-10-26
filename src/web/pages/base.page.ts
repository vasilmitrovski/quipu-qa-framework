import type { Locator, Page } from '@playwright/test';
import { NavPanel } from '../components/nav-panel';

export abstract class BasePage {
  /** Path relative to the region's baseURL, e.g. 'overview.htm'. */
  protected abstract readonly path: string;
  readonly nav: NavPanel;
  readonly title: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavPanel(page);
    // Pages keep hidden result/error panels with their own h1.title; only the visible one is the real title.
    this.title = page.locator('#rightPanel h1.title:visible').first();
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }
}
