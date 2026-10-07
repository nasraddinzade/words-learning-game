import { expect, test } from '@playwright/test';
import { APP_PATH, collectConsoleErrors, openFresh } from './helpers';
import { loadWords } from './words';
import { continueCard, learningRow, localDay, shiftDay, startGame, tapCorrect, typeWord, untilTyping, writeProfile, writeProgress } from './game';

const words = loadWords();
const byId = new Map(words.map((w) => [w.id, w]));

/** Sets the learned counter through the dev panel. The panel stays open: a celebration may be on top. */
async function setLearned(page: import('@playwright/test').Page, n: number) {
  if ((await page.getByTestId('dev-panel').count()) === 0) await page.getByTestId('dev-toggle').click();
  await page.getByTestId('dev-learned-n').fill(String(n));
  await page.getByTestId('dev-learned-set').click();
}

test.describe('celebrations and themes (SPEC 8.2)', () => {
  test('every 100 words celebrates, every 1 000 unlocks a theme', async ({ page }) => {
    await openFresh(page);
    const errors = collectConsoleErrors(page);
    await setLearned(page, 100);
    const c = page.getByTestId('celebration');
    await expect(c).toHaveAttribute('data-kind', 'hundred');
    await expect(page.getByTestId('celebration-value')).toHaveText('100');
    await page.getByTestId('celebration-dismiss').click();
    await expect(c).toHaveCount(0);

    await setLearned(page, 150);
    await expect(c).toHaveCount(0);

    await setLearned(page, 1000);
    await expect(c).toHaveAttribute('data-kind', 'thousand');
    await expect(c).toContainText('New theme unlocked: Ember');
    await page.getByTestId('celebration-try-theme').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ember');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ember');

    await page.getByTestId('dev-toggle').click();
    await page.goto(`${APP_PATH}#/settings`);
    const themes = page.getByTestId('themes');
    await expect(themes.locator('[data-theme-id="ember"]')).toHaveAttribute('aria-checked', 'true');
    await expect(themes.locator('[data-theme-id="ocean"]')).toHaveAttribute('data-unlocked', 'false');
    await expect(themes.locator('[data-theme-id="ocean"]')).toBeDisabled();
    await themes.locator('[data-theme-id="neon"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a jump over several milestones celebrates the last hundred and each thousand', async ({ page }) => {
    await openFresh(page);
    await setLearned(page, 2250);
    const c = page.getByTestId('celebration');
    await expect(page.getByTestId('celebration-value')).toHaveText('2 200');
    await page.getByTestId('celebration-dismiss').click();
    await expect(c).toContainText('Ember');
    await page.getByTestId('celebration-dismiss').click();
    await expect(c).toContainText('Ocean');
    await page.getByTestId('celebration-dismiss').click();
    await expect(c).toHaveCount(0);
    await page.getByTestId('dev-toggle').click();
    await page.goto(`${APP_PATH}#/settings`);
    await expect(page.getByTestId('themes').locator('[data-unlocked="true"]')).toHaveCount(3);
  });
});

test.describe('daily streak with freezes (SPEC 8.2)', () => {
  test('grows day by day, earns a freeze at 7, spends it on a missed day, restarts without blame', async ({ page }) => {
    await startGame(page, { seed: 'streak', newPerGame: 5 });
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await page.getByTestId('go-home').click();
    await expect(page.getByTestId('streak')).toContainText('1 day');

    await shiftDay(page, 1);
    await startGame(page, { seed: 'streak-2', newPerGame: 5, fresh: false });
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('stat-streak')).toHaveText('2 days');

    // Six days done, the seventh earns a freeze.
    await writeProfile(page, { streak: 6, freezes: 0, lastPlayedDay: localDay(1) });
    await shiftDay(page, 1);
    await page.goto(`${APP_PATH}#/`);
    await startGame(page, { seed: 'streak-3', newPerGame: 5, fresh: false });
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('stat-streak')).toHaveText('7 days · 1 ❄');
    await expect(page.getByTestId('streak-note')).toContainText('earned a freeze');
    await page.getByTestId('go-home').click();
    await expect(page.getByTestId('freezes')).toHaveText('1 ❄');

    // Skip a day: the freeze covers it.
    await shiftDay(page, 2);
    await startGame(page, { seed: 'streak-4', newPerGame: 5, fresh: false });
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('stat-streak')).toHaveText('8 days');
    await expect(page.getByTestId('streak-note')).toContainText('A freeze covered a missed day');

    // Skip again without a freeze: the streak restarts, no reproach.
    await shiftDay(page, 2);
    await startGame(page, { seed: 'streak-5', newPerGame: 5, fresh: false });
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('stat-streak')).toHaveText('1 day');
    await expect(page.getByTestId('streak-note')).toHaveText('New streak started today');
  });
});

test.describe('personal bests and combo (SPEC 8.1, 8.2)', () => {
  test('the first game sets records, a weaker game does not', async ({ page }) => {
    await startGame(page, { seed: 'record', newPerGame: 10 });
    await tapCorrect(page);
    await continueCard(page);
    await tapCorrect(page);
    await continueCard(page);
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('record-badge')).toHaveCount(2);
    await expect(page.getByTestId('stat-best-combo')).toContainText('×2');

    await page.getByTestId('play-again').click();
    await expect(page.getByTestId('screen-game')).toBeVisible();
    await tapCorrect(page);
    await continueCard(page);
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('record-badge')).toHaveCount(0);
  });

  test('five in a row lights the combo tier and the field', async ({ page }) => {
    await startGame(page, { seed: 'tier', newPerGame: 10 });
    await expect(page.getByTestId('combo')).toHaveAttribute('data-tier', '0');
    for (let i = 0; i < 5; i++) {
      await tapCorrect(page);
      await continueCard(page);
    }
    await expect(page.getByTestId('combo')).toHaveAttribute('data-tier', '1');
    await expect(page.getByTestId('field')).toHaveAttribute('data-combo-tier', '1');
  });

  test('a learned word flies into the counter before the card', async ({ page }) => {
    await startGame(page, { seed: 'fly', newPerGame: 5 });
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await writeProgress(page, [learningRow('abandon-v', 4, localDay(0))]);
    await page.goto(`${APP_PATH}#/`);
    await startGame(page, { seed: 'fly-2', newPerGame: 5, fresh: false });
    const id = await untilTyping(page);
    await typeWord(page, byId.get(id)!.word);
    await expect(page.getByTestId('learned-flight')).toBeVisible();
    await expect(page.getByTestId('learned-flight')).toHaveText(byId.get(id)!.word);
    await expect(page.getByTestId('card-overlay')).toBeVisible();
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'learned');
    await expect(page.getByTestId('learned')).toContainText('1/10 000');
  });
});
