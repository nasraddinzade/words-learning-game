import { expect, test } from '@playwright/test';
import { APP_PATH, collectConsoleErrors, openFresh } from './helpers';

test.describe('stage 0 smoke', () => {
  test('home renders and every screen is reachable', async ({ page }) => {
    await openFresh(page);
    // Attached after the reset: deleting the DB makes Dexie log an expected warning.
    const errors = collectConsoleErrors(page);

    await expect(page.getByTestId('learned-count')).toContainText('0 / 10 000');
    await expect(page.getByTestId('due-today')).toHaveText('0');
    await expect(page.getByTestId('streak')).toContainText('0');

    await page.getByTestId('play').click();
    await expect(page.getByTestId('screen-setup')).toBeVisible();
    await page.getByRole('radio', { name: /^B1/ }).click();
    await page.getByRole('radiogroup', { name: 'New words per game' }).getByRole('radio', { name: '15' }).click();
    await page.getByTestId('start-game').click();

    await expect(page.getByTestId('screen-game')).toBeVisible();
    await expect(page.getByTestId('lives')).toHaveText('♥♥♥');
    await expect(page.getByTestId('explanation')).toBeVisible();
    await page.getByTestId('stub-card').click();

    await expect(page.getByTestId('screen-card')).toBeVisible();
    await expect(page.getByTestId('translation')).toHaveCount(0);
    await page.getByTestId('show-translation').click();
    await expect(page.getByTestId('translation')).toBeVisible();
    await page.getByTestId('continue').click();

    await expect(page.getByTestId('screen-game')).toBeVisible();
    await page.getByTestId('stub-end').click();
    await expect(page.getByTestId('screen-summary')).toBeVisible();
    await page.getByTestId('go-home').click();

    await expect(page.getByTestId('screen-home')).toBeVisible();
    await page.getByTestId('nav-map').click();
    await expect(page.getByTestId('map-grid').locator('[data-cell]')).toHaveCount(100);
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByTestId('nav-speed').click();
    await expect(page.getByTestId('screen-speed')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByTestId('nav-settings').click();
    await expect(page.getByTestId('screen-settings')).toBeVisible();

    // Setup choices were persisted to IndexedDB and show up in Settings after a reload.
    await page.reload();
    await expect(page.getByTestId('screen-settings')).toBeVisible();
    await expect(page.getByRole('radio', { name: /^B1/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radiogroup', { name: 'New words per game' }).getByRole('radio', { name: '15' })).toHaveAttribute('aria-checked', 'true');

    await page.getByTestId('toggle-sound').click();
    await expect(page.getByTestId('toggle-sound')).toHaveAttribute('aria-checked', 'false');
    await page.reload();
    await expect(page.getByTestId('toggle-sound')).toHaveAttribute('aria-checked', 'false');

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('hash routing opens a screen directly and back returns', async ({ page }) => {
    await openFresh(page);
    await page.goto(`${APP_PATH}#/settings`);
    await expect(page.getByTestId('screen-settings')).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('screen-home')).toBeVisible();
  });

  test('no horizontal scroll on any screen', async ({ page }) => {
    await openFresh(page);
    for (const hash of ['', 'setup', 'game', 'card', 'summary', 'map', 'speed', 'settings']) {
      await page.goto(`${APP_PATH}#/${hash}`);
      await expect(page.locator('main[data-testid^="screen-"]')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on #/${hash}`).toBeLessThanOrEqual(0);
    }
  });

  test('PWA manifest and service worker are served under the base path', async ({ page, request }) => {
    await openFresh(page);
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBe(`${APP_PATH}manifest.webmanifest`);
    const manifest = await (await request.get(href!)).json();
    expect(manifest.start_url).toBe(APP_PATH);
    expect(manifest.scope).toBe(APP_PATH);
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons as Array<{ src: string }>) {
      const res = await request.get(APP_PATH + icon.src);
      expect(res.status(), icon.src).toBe(200);
    }
    const sw = await request.get(`${APP_PATH}sw.js`);
    expect(sw.status()).toBe(200);
  });
});
