import { expect, test } from '@playwright/test';
import { loadWords } from './words';
import { APP_PATH } from './helpers';
import { answerRound, continueCard, isTypingRound, localDay, readProgress, readRound, shiftDay, startGame, tapCorrect, tapWrong, writeProgress, type ProgressRow } from './game';

const words = loadWords();
const byId = new Map(words.map((w) => [w.id, w]));

test.describe('learning logic across days', () => {
  test('steps 1-3 on different days, one step per day, rollback on a mistake', async ({ page }) => {
    // Day 0: five new words, all correct → step 2, due tomorrow.
    await startGame(page, { seed: 'days', newPerGame: 5 });
    const day0: string[] = [];
    for (let i = 0; i < 5; i++) {
      day0.push((await tapCorrect(page)).correctId);
      await continueCard(page);
    }
    await expect(page.getByTestId('summary-title')).toHaveText('Round complete');
    let progress = await readProgress(page);
    for (const id of day0) {
      expect(progress[id]?.step, id).toBe(2);
      expect(progress[id]?.dueDay, id).toBe(localDay(1));
      expect(progress[id]?.lastAdvanceDay, id).toBe(localDay(0));
    }

    // Same day again: nothing is due, the game gives five different new words.
    await startGame(page, { seed: 'days-2', newPerGame: 5, fresh: false });
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('dev-queue')).toContainText('debts 0 · reviews 0 · new 5');
    await page.getByTestId('dev-toggle').click();
    const sameDay = await readRound(page);
    expect(day0).not.toContain(sameDay.correctId);
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();

    // Day 1: the five are due; correct → step 3, due in two days.
    await shiftDay(page, 1);
    await startGame(page, { seed: 'days-3', newPerGame: 5, fresh: false });
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('dev-queue')).toContainText('debts 0 · reviews 5 · new 5');
    await page.getByTestId('dev-toggle').click();
    for (let i = 0; i < 10; i++) {
      await tapCorrect(page);
      await continueCard(page);
    }
    await expect(page.getByTestId('summary-title')).toHaveText('Round complete');
    progress = await readProgress(page);
    for (const id of day0) {
      expect(progress[id]?.step, id).toBe(3);
      expect(progress[id]?.dueDay, id).toBe(localDay(3));
    }

    // Day 3: the step-3 words come back as typing rounds. A typo drops one to step 2 and it
    // returns in debt (as a tap round now); the debt clears without a second step up that day.
    await shiftDay(page, 2);
    await startGame(page, { seed: 'days-4', newPerGame: 5, fresh: false });
    let wrongId: string | null = null;
    for (let guard = 0; guard < 12 && !wrongId; guard++) {
      if (await isTypingRound(page)) {
        wrongId = await answerRound(page, false, byId);
      } else {
        await tapCorrect(page);
      }
      await continueCard(page);
    }
    expect(day0).toContain(wrongId);
    expect(wrongId).not.toBeNull();
    progress = await readProgress(page);
    expect(progress[wrongId!]?.step).toBe(2);
    expect(progress[wrongId!]?.inDebt).toBe(true);
    expect(progress[wrongId!]?.lapses).toBe(1);

    for (let guard = 0; guard < 8; guard++) {
      const id = await answerRound(page, true, byId);
      await continueCard(page);
      if (id === wrongId) break;
    }
    progress = await readProgress(page);
    expect(progress[wrongId!]?.inDebt).toBe(false);
    expect(progress[wrongId!]?.step).toBe(2);
    expect(progress[wrongId!]?.dueDay).toBe(localDay(4));
    // The mistake was a typo in a typing round: no confusion entry (those come from wrong taps).
    expect(progress[wrongId!]?.confusedWith).toHaveLength(0);
    expect(progress[wrongId!]?.lapses).toBe(1);
  });

  test('the regulator cuts new words when many reviews are due', async ({ page }) => {
    await startGame(page, { seed: 'reg', newPerGame: 10 });
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    const today = localDay(0);
    const mkRows = (n: number): ProgressRow[] =>
      words.slice(0, n).map((w) => ({ wordId: w.id, step: 2, status: 'learning', dueDay: today, lastAdvanceDay: null, inDebt: false, lapses: 0, confusedWith: [], flagged: false }));

    await writeProgress(page, mkRows(35));
    await page.goto(`${APP_PATH}#/`);
    await page.reload();
    await expect(page.getByTestId('due-today')).toHaveText('35');
    await startGame(page, { seed: 'reg-2', newPerGame: 10, fresh: false });
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('dev-queue')).toContainText('debts 0 · reviews 35 · new 5 · deferred 0');
    await page.getByTestId('dev-toggle').click();
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();

    await writeProgress(page, mkRows(65));
    await page.goto(`${APP_PATH}#/`);
    await page.reload();
    await expect(page.getByTestId('due-today')).toHaveText('65');
    await startGame(page, { seed: 'reg-3', newPerGame: 10, fresh: false });
    await page.getByTestId('dev-toggle').click();
    await expect(page.getByTestId('dev-queue')).toContainText('debts 0 · reviews 40 · new 0 · deferred 25');
  });

  test('unresolved debts open the next game', async ({ page }) => {
    await startGame(page, { seed: 'carry', newPerGame: 5 });
    const missed = (await tapWrong(page)).correctId;
    await continueCard(page);
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('go-home')).toBeVisible();
    await page.getByTestId('go-home').click();
    await expect(page.getByTestId('due-today')).toHaveText('1');
    await startGame(page, { seed: 'carry-2', newPerGame: 5, fresh: false });
    const first = await readRound(page);
    expect(first.correctId).toBe(missed);
    await expect(page.getByTestId('explanation')).toContainText('It came back');
  });
});
