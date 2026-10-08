import { expect, test } from '@playwright/test';
import { APP_PATH } from './helpers';
import { loadWords } from './words';
import { continueCard, learningRow, localDay, readProgress, readRound, startGame, tapCorrect, typeWord, untilTyping, writeProgress } from './game';

const words = loadWords();
const byId = new Map(words.map((w) => [w.id, w]));

/** Starts a fresh profile, injects rows, and starts a game on them. */
async function startWith(page: import('@playwright/test').Page, rows: Parameters<typeof writeProgress>[1], seed: string, speed = 2, fast = false) {
  await startGame(page, { seed, speed, newPerGame: 5 });
  await page.getByTestId('pause').click();
  await page.getByTestId('quit').click();
  await writeProgress(page, rows);
  await page.goto(`${APP_PATH}#/`);
  await startGame(page, { seed: `${seed}-2`, speed, newPerGame: 5, fresh: false });
  await untilTyping(page, { fast });
}

test.describe('typing rounds', () => {
  test('step 3 shows the first letter, correct typing moves the word to step 4', async ({ page }) => {
    const today = localDay(0);
    await startWith(page, [learningRow('abandon-v', 3, today)], 'type-3');
    await expect(page.getByTestId('hint')).toHaveText('Type the word. First letter is shown');
    const slots = page.getByTestId('typing-slots').locator('span');
    await expect(slots).toHaveCount('abandon'.length);
    await expect(slots.first()).toHaveText('a');
    await expect(slots.nth(1)).toHaveText('·');
    const input = page.getByTestId('typing-input');
    await expect(input).toHaveAttribute('autocorrect', 'off');
    await expect(input).toHaveAttribute('autocapitalize', 'off');
    await expect(input).toHaveAttribute('autocomplete', 'off');
    await expect(input).toHaveAttribute('spellcheck', 'false');
    await expect(input).toBeFocused();

    await typeWord(page, 'aban');
    await expect(slots.nth(3)).toHaveText('n');
    await typeWord(page, 'abandon');
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'correct');
    await continueCard(page);
    const progress = await readProgress(page);
    expect(progress['abandon-v']?.step).toBe(4);
    expect(progress['abandon-v']?.dueDay).toBe(localDay(4));
  });

  test('a typo costs a life, shows what was typed and drops the step', async ({ page }) => {
    await startWith(page, [learningRow('accomplish-v', 3, localDay(0))], 'typo');
    await typeWord(page, 'accomplsih');
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'typo');
    await expect(page.getByTestId('card-typed')).toContainText('accomplsih');
    await expect(page.getByTestId('card-word')).toHaveText('accomplish');
    await continueCard(page);
    await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '2');
    const progress = await readProgress(page);
    expect(progress['accomplish-v']?.step).toBe(2);
    expect(progress['accomplish-v']?.inDebt).toBe(true);
  });

  test('Enter submits a short answer as a mistake', async ({ page }) => {
    await startWith(page, [learningRow('abandon-v', 4, localDay(0))], 'enter');
    await expect(page.getByTestId('hint')).toHaveText('Type the word');
    await expect(page.getByTestId('typing-slots').locator('span').first()).toHaveText('·');
    await typeWord(page, 'aban', true);
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'typo');
  });

  test('an accepted spelling variant counts and step 4 learns the word', async ({ page }) => {
    expect(byId.get('fulfil-v')?.accept).toContain('fulfill');
    await startWith(page, [learningRow('fulfil-v', 4, localDay(0))], 'accept');
    await typeWord(page, 'fulfill');
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'learned');
    await continueCard(page);
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await expect(page.getByTestId('stat-learned-today')).toHaveText('1');
    const progress = await readProgress(page);
    expect(progress['fulfil-v']?.status).toBe('learned');
    expect(progress['fulfil-v']?.dueDay).toBe(localDay(21));
    await page.getByTestId('go-home').click();
    await expect(page.getByTestId('learned-count')).toContainText('1 / 10 000');
  });

  test('a typing word that reaches the bottom is a miss', async ({ page }) => {
    await startWith(page, [learningRow('abandon-v', 3, localDay(0))], 'fall', 6, true);
    await expect(page.getByTestId('card-overlay')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'missed');
    await continueCard(page);
    await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '2');
  });

  test('tap and typing rounds alternate in the queue', async ({ page }) => {
    const today = localDay(0);
    const rows = [
      learningRow('abandon-v', 3, today),
      learningRow('accomplish-v', 3, today),
      learningRow('acknowledge-v', 3, today),
      learningRow('adapt-v', 1, today),
      learningRow('adjust-v', 1, today),
      learningRow('admire-v', 1, today),
    ];
    await startWith(page, rows, 'alt');
    const kinds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const typing = await page.getByTestId('typing-word').count();
      kinds.push(typing > 0 ? 'type' : 'tap');
      if (typing > 0) {
        const id = await page.getByTestId('typing-word').getAttribute('data-word-id');
        await typeWord(page, byId.get(id!)!.word);
      } else await tapCorrect(page);
      await continueCard(page);
    }
    // 8 tap rounds (3 reviews + 5 new) and 3 typing rounds: typing rounds are spread out, never adjacent.
    expect(kinds.filter((k) => k === 'type').length).toBeGreaterThanOrEqual(1);
    expect(kinds.filter((k) => k === 'tap').length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < kinds.length; i++) expect(kinds[i] === 'type' && kinds[i - 1] === 'type', kinds.join(',')).toBe(false);
  });
});

test.describe('fast skip (SPEC 6.3)', () => {
  test('a fast first tap earns a typing check that learns the word at once', async ({ page }) => {
    await startGame(page, { seed: 'skip', speed: 0.5, newPerGame: 10 });
    const first = await tapCorrect(page, { fast: true });
    await continueCard(page);
    let checked = false;
    for (let i = 0; i < 6 && !checked; i++) {
      if ((await page.getByTestId('typing-word').count()) > 0) {
        await expect(page.getByTestId('hint')).toHaveText('You knew it fast. Type it to learn it now');
        expect(await page.getByTestId('typing-word').getAttribute('data-word-id')).toBe(first.correctId);
        await typeWord(page, byId.get(first.correctId)!.word);
        await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'learned');
        checked = true;
      } else {
        // Slow taps on the other new words. A word counts as fast within the first third of its
        // own fall, and words spawn up to 30% of the fall late, so tap at ~14 s: past the third of
        // the last-spawned word (12.7 s at level 0, 10.8 s at levels 1-2) and before the first one
        // reaches the bottom (17-20 s at speed 0.5). tapCorrect adds its own 2 s.
        await readRound(page);
        await page.waitForTimeout(12000);
        await tapCorrect(page);
      }
      await continueCard(page);
    }
    expect(checked).toBe(true);
    const progress = await readProgress(page);
    expect(progress[first.correctId]?.status).toBe('learned');
    await expect(page.getByTestId('learned')).toContainText('1/10 000');
  });

  test('a failed skip check costs no life', async ({ page }) => {
    await startGame(page, { seed: 'skip-fail', speed: 0.5, newPerGame: 10 });
    const first = await tapCorrect(page, { fast: true });
    await continueCard(page);
    let checked = false;
    for (let i = 0; i < 6 && !checked; i++) {
      if ((await page.getByTestId('typing-word').count()) > 0) {
        await typeWord(page, 'x'.repeat(byId.get(first.correctId)!.word.length));
        await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'skipFailed');
        checked = true;
      } else {
        // Same slow-tap timing as above: past every word's first third, before the bottom.
        await readRound(page);
        await page.waitForTimeout(12000);
        await tapCorrect(page);
      }
      await continueCard(page);
    }
    expect(checked).toBe(true);
    await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '3');
    const progress = await readProgress(page);
    expect(progress[first.correctId]?.step).toBe(2);
    expect(progress[first.correctId]?.inDebt).toBe(false);
  });
});

test.describe('control checks (SPEC 6.5)', () => {
  test('learned words are re-checked by typing; a failure returns them to step 3', async ({ page }) => {
    const today = localDay(0);
    const learned = (id: string) => learningRow(id, 4, today, { status: 'learned', learnedDay: localDay(-21), checksPassed: 0 });
    await startGame(page, { seed: 'check', speed: 2, newPerGame: 5 });
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await writeProgress(page, [learned('abandon-v'), learned('accomplish-v')]);
    await page.goto(`${APP_PATH}#/`);
    await page.getByTestId('dev-toggle').click();
    await page.getByTestId('dev-learned-n').fill('5');
    await page.getByTestId('dev-learned-set').click();
    await expect(page.getByTestId('due-today')).toHaveText('2');
    await startGame(page, { seed: 'check-3', speed: 2, newPerGame: 5, fresh: false });

    for (let i = 0; i < 2; i++) {
      const id = await untilTyping(page);
      await expect(page.getByTestId('hint')).toHaveText('Still remember it? Type the word');
      if (id === 'abandon-v') await typeWord(page, 'abandon');
      else await typeWord(page, 'x'.repeat('accomplish'.length));
      await continueCard(page);
    }
    const progress = await readProgress(page);
    expect(progress['abandon-v']?.status).toBe('learned');
    expect(progress['abandon-v']?.checksPassed).toBe(1);
    expect(progress['abandon-v']?.dueDay).toBe(localDay(39));
    expect(progress['accomplish-v']?.status).toBe('learning');
    expect(progress['accomplish-v']?.step).toBe(3);
    expect(progress['accomplish-v']?.inDebt).toBe(true);
    await expect(page.getByTestId('learned')).toContainText('4/10 000');
  });
});
