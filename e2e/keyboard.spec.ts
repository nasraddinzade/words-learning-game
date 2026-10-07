import { expect, test } from '@playwright/test';
import { continueCard, readRound, startGame } from './game';

test.describe('desktop keyboard (SPEC 12)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'keyboard control is for the desktop');

  test('digits tap chips, Enter continues, Escape pauses and resumes', async ({ page }) => {
    await startGame(page, { seed: 'keys', newPerGame: 10 });
    const round = await readRound(page);
    const chips = page.getByTestId('falling-word');
    await expect(chips.first().locator('.key-badge')).toBeVisible();
    const order = await chips.evaluateAll((els) => els.map((el) => el.getAttribute('data-word-id')));
    const index = order.indexOf(round.correctId) + 1;
    const chip = page.locator(`[data-testid="falling-word"][data-word-id="${round.correctId}"]`);
    await expect(chip).toHaveCSS('opacity', '1');
    await page.waitForTimeout(2000);
    await page.keyboard.press(String(index));
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'correct');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('card-overlay')).toHaveCount(0);

    await readRound(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('pause-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('pause-overlay')).toHaveCount(0);

    // A key for a chip that has not spawned yet does nothing.
    const next = await readRound(page);
    const notYet = await chips.evaluateAll((els) => els.findIndex((el) => el.style.opacity !== '1'));
    if (notYet >= 0) {
      await page.keyboard.press(String(notYet + 1));
      await expect(page.getByTestId('card-overlay')).toHaveCount(0);
    }
    await page.waitForTimeout(2000);
    await page.keyboard.press(String((await chips.evaluateAll((els) => els.map((el) => el.getAttribute('data-word-id')))).indexOf(next.correctId) + 1));
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'correct');
    await continueCard(page);
  });
});
