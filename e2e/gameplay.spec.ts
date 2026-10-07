import { expect, test } from '@playwright/test';
import { loadWords } from './words';
import { collectConsoleErrors } from './helpers';
import { continueCard, readRound, startGame, tapCorrect, tapWrong } from './game';

const words = loadWords();
const byId = new Map(words.map((w) => [w.id, w]));

test.describe('gameplay', () => {
  test('correct tap, card, translation, wrong tap, lives and combo', async ({ page }) => {
    await startGame(page, { seed: 'play-1', newPerGame: 10 });
    const errors = collectConsoleErrors(page);
    await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '3');
    await expect(page.getByTestId('definition')).not.toHaveText('…');

    const first = await tapCorrect(page);
    await expect(page.getByTestId('card-word')).toHaveText(byId.get(first.correctId)!.word);
    await expect(page.getByTestId('translation')).toHaveCount(0);
    await page.getByTestId('show-translation').click();
    await expect(page.getByTestId('translation')).toHaveText(byId.get(first.correctId)!.translation);
    await continueCard(page);
    await expect(page.getByTestId('combo')).toContainText('1');
    await expect(page.getByTestId('score')).not.toHaveText('0');

    const second = await tapWrong(page);
    await expect(page.getByTestId('card-word')).toHaveText(byId.get(second.correctId)!.word);
    await expect(page.getByTestId('card-chosen')).toContainText(byId.get(second.wrongId)!.word);
    await continueCard(page);
    await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '2');
    await expect(page.getByTestId('combo')).toContainText('0');

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('distractors share the part of speech and never come from avoid', async ({ page }) => {
    await startGame(page, { seed: 'pos-check', newPerGame: 10 });
    for (let i = 0; i < 6; i++) {
      const round = await readRound(page);
      const target = byId.get(round.correctId)!;
      expect(round.options.length).toBeGreaterThanOrEqual(3);
      for (const o of round.options) {
        const e = byId.get(o.id)!;
        expect(e.pos, `${o.id} vs ${target.id}`).toBe(target.pos);
        expect(target.avoid, `${e.word} is in avoid of ${target.word}`).not.toContain(e.word);
        expect(o.word).toBe(e.word);
      }
      expect(new Set(round.options.map((o) => o.id)).size).toBe(round.options.length);
      await tapCorrect(page);
      await continueCard(page);
    }
  });

  test('a missed word costs a life and shows the card', async ({ page }) => {
    await startGame(page, { seed: 'miss', speed: 5, newPerGame: 5 });
    await expect(page.getByTestId('card-overlay')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'missed');
    await continueCard(page);
    await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '2');
  });

  test('a mistaken word comes back within 3-5 rounds in the same game', async ({ page }) => {
    await startGame(page, { seed: 'debt', newPerGame: 15 });
    const missed = await tapWrong(page);
    await continueCard(page);
    let roundsUntilReturn = 0;
    for (let i = 0; i < 6; i++) {
      const round = await readRound(page);
      roundsUntilReturn += 1;
      if (round.correctId === missed.correctId) break;
      await tapCorrect(page);
      await continueCard(page);
    }
    expect(roundsUntilReturn).toBeGreaterThanOrEqual(3);
    expect(roundsUntilReturn).toBeLessThanOrEqual(5);
    await expect(page.getByTestId('explanation')).toContainText('It came back');
    await tapCorrect(page);
    await continueCard(page);
  });

  test('losing all lives ends with Game over and the summary lists the mistakes', async ({ page }) => {
    await startGame(page, { seed: 'over', newPerGame: 10 });
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push((await tapWrong(page)).correctId);
      if (i < 2) await continueCard(page);
    }
    await expect(page.getByTestId('continue')).toHaveText('See results');
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('screen-summary')).toBeVisible();
    await expect(page.getByTestId('summary-title')).toHaveText('Game over');
    await expect(page.getByTestId('stat-came-back')).toHaveText('3');
    await expect(page.getByTestId('mistake')).toHaveCount(new Set(ids).size);
    await page.getByTestId('mistake').first().click();
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'review');
    await expect(page.getByTestId('card-word')).toHaveText(byId.get(ids[0]!)!.word);
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('word-card')).toHaveCount(0);
  });

  test('clearing the queue ends with Round complete', async ({ page }) => {
    await startGame(page, { seed: 'complete', newPerGame: 5 });
    for (let i = 0; i < 5; i++) {
      await tapCorrect(page);
      if (i < 4) await continueCard(page);
    }
    await expect(page.getByTestId('continue')).toHaveText('See results');
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('summary-title')).toHaveText('Round complete');
    await expect(page.getByTestId('stat-moved-up')).toHaveText('5');
    await expect(page.getByTestId('stat-came-back')).toHaveText('0');
    await expect(page.getByTestId('stat-best-combo')).toHaveText('×5');
    await page.getByTestId('go-home').click();
    await expect(page.getByTestId('due-today')).toHaveText('0');
  });

  test('pause stops the fall and quit goes to the summary', async ({ page }) => {
    await startGame(page, { seed: 'pause', newPerGame: 5 });
    const chip = page.locator('[data-testid="falling-word"][data-correct="true"]');
    await expect(chip).toHaveCSS('opacity', '1');
    await page.getByTestId('pause').click();
    await expect(page.getByTestId('pause-overlay')).toBeVisible();
    const before = await chip.evaluate((el) => el.style.transform);
    await page.waitForTimeout(600);
    expect(await chip.evaluate((el) => el.style.transform)).toBe(before);
    await page.getByTestId('resume').click();
    await expect(page.getByTestId('pause-overlay')).toHaveCount(0);
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('summary-title')).toHaveText('Game stopped');
  });

  test('Bad card flags the entry', async ({ page }) => {
    await startGame(page, { seed: 'flag', newPerGame: 5 });
    const round = await tapCorrect(page);
    await page.getByTestId('bad-card').click();
    await expect(page.getByTestId('bad-card')).toHaveText('Flagged');
    await continueCard(page);
    const progress = await (await import('./game')).readProgress(page);
    expect(progress[round.correctId]?.flagged).toBe(true);
  });
});
