import { expect, test } from '@playwright/test';
import { APP_PATH, collectConsoleErrors, openFresh } from './helpers';

test.describe('offline', () => {
  test('the app opens and works with the network off', async ({ page, context }) => {
    await openFresh(page);
    // Attached after the reset: deleting the DB makes Dexie log an expected warning.
    const errors = collectConsoleErrors(page);

    // Wait until the service worker controls the page, then reload once so precaching is done.
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active?.state === 'activated' && !!navigator.serviceWorker.controller;
    }, undefined, { timeout: 20_000 });
    await page.reload();
    await expect(page.getByTestId('screen-home')).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('screen-home')).toBeVisible();
    await page.getByTestId('play').click();
    await expect(page.getByTestId('screen-setup')).toBeVisible();
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('screen-game')).toBeVisible();
    // The word batch must come from the cache too.
    await expect(page.getByTestId('falling-word').first()).toBeAttached();
    await expect(page.getByTestId('definition')).not.toHaveText('…');

    // A cold navigation to a deep link must also come from the cache.
    await page.goto(`${APP_PATH}#/settings`);
    await expect(page.getByTestId('screen-settings')).toBeVisible();
    await context.setOffline(false);

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
