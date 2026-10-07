import { expect, test } from '@playwright/test';
import { openFresh } from './helpers';

const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

test.describe('dev tools', () => {
  test('reads ?seed and ?speed', async ({ page }) => {
    await openFresh(page, '?seed=42&speed=0.5');
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('dev-seed')).toHaveText('42');
    await expect(page.getByTestId('dev-speed')).toHaveText('×0.5');
  });

  test('defaults to a random seed and normal speed', async ({ page }) => {
    await openFresh(page);
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('dev-seed')).toHaveText('random');
    await expect(page.getByTestId('dev-speed')).toHaveText('×1');
  });

  test('shifts the day and keeps the offset across reloads', async ({ page }) => {
    await openFresh(page);
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('dev-today')).toContainText(todayLocal());
    await page.getByTestId('dev-day-plus-1').click();
    await expect(page.getByTestId('dev-today')).toContainText(plusDays(1));
    await page.getByTestId('dev-day-plus-7').click();
    await expect(page.getByTestId('dev-today')).toContainText(plusDays(8));
    await page.getByTestId('dev-day-n').fill('21');
    await page.getByTestId('dev-day-shift').click();
    await expect(page.getByTestId('dev-today')).toContainText(`${plusDays(29)} (offset +29)`);

    await page.reload();
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('dev-today')).toContainText('(offset +29)');
    await page.getByTestId('dev-day-reset').click();
    await expect(page.getByTestId('dev-today')).toContainText('(offset +0)');
  });

  test('sets the learned counter and resets progress', async ({ page }) => {
    await openFresh(page);
    await page.getByTestId('dev-toggle').click();
    await page.getByTestId('dev-learned-n').fill('250');
    await page.getByTestId('dev-learned-set').click();
    // 250 crosses 200: the celebration shows first (stage 3).
    await expect(page.getByTestId('celebration-value')).toHaveText('200');
    await page.getByTestId('celebration-dismiss').click();
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('learned-count')).toContainText('250 / 10 000');

    await page.getByTestId('nav-map').click();
    await expect(page.getByTestId('map-grid').locator('[data-cell="full"]')).toHaveCount(2);
    await expect(page.getByTestId('map-grid').locator('[data-cell="partial"]')).toHaveCount(1);

    await page.reload();
    await expect(page.getByTestId('map-grid').locator('[data-cell="full"]')).toHaveCount(2);

    page.once('dialog', (d) => void d.accept());
    await page.getByTestId('dev-toggle').click();
    await page.getByTestId('dev-reset').click();
    await expect(page.getByTestId('map-grid').locator('[data-cell="full"]')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('map-grid').locator('[data-cell="full"]')).toHaveCount(0);
  });
});
