import { expect, test } from '@playwright/test';
import { APP_PATH, openFresh } from './helpers';
import { loadWords } from './words';
import { readProgress } from './game';

const words = loadWords();
const byId = new Map(words.map((w) => [w.id, w]));

test.describe('speed check (SPEC 7)', () => {
  test('explains itself when nothing is below the start level', async ({ page }) => {
    await openFresh(page);
    await page.goto(`${APP_PATH}#/settings`);
    await page.getByRole('radio', { name: /^A1/ }).click();
    await page.goto(`${APP_PATH}#/`);
    await page.getByTestId('nav-speed').click();
    await expect(page.getByTestId('speed-empty')).toBeVisible();
    await expect(page.getByTestId('speed-empty')).toContainText('A1, the lowest one');
  });

  test('types words below the start level: correct → learned, skip → queue', async ({ page }) => {
    await openFresh(page, '?speed=2');
    await page.goto(`${APP_PATH}#/settings`);
    await page.getByRole('radio', { name: /^C1/ }).click();
    await page.goto(`${APP_PATH}#/`);
    await page.getByTestId('nav-speed').click();
    await expect(page.getByTestId('speed-progress')).toHaveText('1 / 20');

    const input = page.getByTestId('typing-input');
    await expect(input).toBeFocused();
    const first = (await page.getByTestId('typing-word').getAttribute('data-word-id'))!;
    await expect(page.getByTestId('typing-word')).toHaveCSS('opacity', '1');
    await input.fill(byId.get(first)!.word);
    await expect(page.getByTestId('speed-feedback')).toHaveAttribute('data-outcome', 'learned');
    await expect(page.getByTestId('speed-progress')).toHaveText('2 / 20');

    const second = (await page.getByTestId('typing-word').getAttribute('data-word-id'))!;
    await page.getByTestId('speed-skip').click();
    await expect(page.getByTestId('speed-feedback')).toHaveAttribute('data-outcome', 'queued');
    await expect(page.getByTestId('speed-learned-live')).toHaveText('✓ 1');

    const third = (await page.getByTestId('typing-word').getAttribute('data-word-id'))!;
    await input.fill('zz');
    await input.press('Enter');
    await expect(page.getByTestId('speed-feedback')).toHaveAttribute('data-outcome', 'queued');

    const progress = await readProgress(page);
    expect(progress[first]?.status).toBe('learned');
    expect(progress[second]?.step).toBe(1);
    expect(progress[second]?.status).toBe('learning');
    expect(progress[third]?.status).toBe('learning');

    await page.goto(`${APP_PATH}#/`);
    await expect(page.getByTestId('learned-count')).toContainText('1 / 10 000');
    await expect(page.getByTestId('due-today')).toHaveText('2');
  });
});
