import { expect, type Page } from '@playwright/test';

export const APP_PATH = '/words-learning-game/';
export const DB_NAME = 'words-learning-game';

/** Opens the app with a clean profile: wipes IndexedDB and localStorage, then loads `query`. */
export async function openFresh(page: Page, query = ''): Promise<void> {
  await page.goto(APP_PATH);
  await page.evaluate(async (dbName) => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  }, DB_NAME);
  await page.goto(APP_PATH + query);
  await expect(page.getByTestId('screen-home')).toBeVisible();
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  return errors;
}
