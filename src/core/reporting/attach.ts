import type { TestInfo } from '@playwright/test';

/** Attach a JSON payload to the Playwright report (visible in the HTML report per test). */
export async function attachJson(testInfo: TestInfo, name: string, payload: unknown): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(payload, null, 2),
    contentType: 'application/json',
  });
}

/** Link a test to an entry in docs/known-issues.md so known app defects stay visible in the report. */
export function knownIssue(testInfo: TestInfo, id: string, summary: string): void {
  testInfo.annotations.push({ type: 'known-issue', description: `${id}: ${summary} (see docs/known-issues.md)` });
}
