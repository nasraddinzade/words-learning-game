import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { APP_PATH, openFresh } from './helpers';
import { continueCard, learningRow, localDay, readRound, startGame, tapCorrect, tapWrong, untilTyping, writeProfile, writeProgress } from './game';
import { THEMES } from '../src/app/themes';

/**
 * Captures every screen and game state for the verification report (SPEC §13 step 3).
 * Files land in docs/verification/screenshots/<stage>/<project>-<name>.png.
 */
const STAGE = process.env.STAGE ?? 'stage-4';
const DIR = `docs/verification/screenshots/${STAGE}`;

test('capture all screens', async ({ page }, testInfo) => {
  mkdirSync(DIR, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: `${DIR}/${testInfo.project.name}-${name}.png`, scale: 'css', fullPage: false });

  await openFresh(page);
  await shot('home');
  await page.goto(`${APP_PATH}#/setup`);
  await shot('setup');

  await startGame(page, { seed: 'shots', speed: 1, newPerGame: 10, fresh: false });
  const chip = page.locator('[data-testid="falling-word"]').last();
  await chip.waitFor();
  await page.waitForTimeout(4000);
  await shot('game-falling');
  await tapCorrect(page);
  await shot('card-correct');
  await page.getByTestId('show-translation').click();
  await shot('card-translation');
  await continueCard(page);
  await readRound(page);
  await page.waitForTimeout(1500);
  await tapWrong(page);
  await shot('card-wrong');
  await continueCard(page);
  await readRound(page);
  await page.waitForTimeout(1500);
  await page.getByTestId('pause').click();
  await shot('pause');
  await page.getByTestId('quit').click();
  await shot('summary');

  // Typing rounds: step 3 with the first letter, then a typo card.
  await writeProgress(page, [learningRow('deteriorate-v', 3, localDay(0))]);
  await page.goto(`${APP_PATH}#/`);
  await startGame(page, { seed: 'shots-type', speed: 0.5, newPerGame: 5, fresh: false });
  await untilTyping(page);
  await page.waitForTimeout(2500);
  await shot('typing-step3');
  await page.getByTestId('typing-input').fill('deter');
  await shot('typing-partial');
  await page.getByTestId('typing-input').fill('deteriorxte');
  await shot('card-typo');
  await continueCard(page);
  await page.getByTestId('pause').click();
  await page.getByTestId('quit').click();

  // Speed check with the start level raised to C1.
  await page.goto(`${APP_PATH}#/settings`);
  await page.getByRole('radio', { name: /^C1/ }).click();
  await page.goto(`${APP_PATH}#/`);
  await page.getByTestId('nav-speed').click();
  await page.getByTestId('typing-word').waitFor();
  await page.waitForTimeout(1500);
  await shot('speed-round');
  const id = (await page.getByTestId('typing-word').getAttribute('data-word-id'))!;
  const words = (await import('./words')).loadWords();
  await page.getByTestId('typing-input').fill(words.find((w) => w.id === id)!.word);
  await shot('speed-feedback');
  await page.goto(`${APP_PATH}#/settings`);
  await page.getByRole('radio', { name: /^B2/ }).click();
  await page.goto(`${APP_PATH}#/speed`);
  await shot('speed-empty');

  await page.goto(`${APP_PATH}#/`);
  await page.getByTestId('dev-toggle').click();
  await page.getByTestId('dev-learned-n').fill('1234');
  await page.getByTestId('dev-learned-set').click();
  await shot('celebration-hundred');
  await page.getByTestId('celebration-dismiss').click();
  await shot('celebration-thousand');
  await page.getByTestId('celebration-dismiss').click();
  await shot('dev-panel');
  await page.getByTestId('dev-toggle').click();
  await page.goto(`${APP_PATH}#/map`);
  await shot('map');
  await page.goto(`${APP_PATH}#/settings`);
  await shot('settings');

  // Summary with records, then every theme on Home and in a round (contrast check, SPEC 13.3).
  await startGame(page, { seed: 'shots-record', speed: 1, newPerGame: 5, fresh: false });
  await tapCorrect(page);
  await continueCard(page);
  await page.getByTestId('pause').click();
  await page.getByTestId('quit').click();
  await shot('summary-records');

  if (testInfo.project.name === 'phone') {
    for (const theme of THEMES) {
      await writeProfile(page, { theme: theme.id, unlockedThemes: THEMES.map((t) => t.id) });
      await page.goto(`${APP_PATH}#/`);
      await page.reload();
      await shot(`theme-${theme.id}-home`);
      await startGame(page, { seed: `shots-${theme.id}`, speed: 1, newPerGame: 5, fresh: false });
      await readRound(page);
      await page.waitForTimeout(3500);
      await shot(`theme-${theme.id}-game`);
      await page.getByTestId('pause').click();
      await page.getByTestId('quit').click();
    }
    await page.goto(`${APP_PATH}#/settings`);
    await shot('settings-themes');
    await page.getByTestId('import-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{ not json') });
    await page.getByTestId('import-error').scrollIntoViewIfNeeded();
    await shot('import-error');
    const exportJson = JSON.stringify({ app: 'words-learning-game', version: 1, exportedAt: '2026-10-01T10:00:00.000Z', profile: { learnedCount: 7, streak: 2, freezes: 0, lastPlayedDay: null, settings: {} }, progress: [], flagged: [] });
    await page.getByTestId('import-file').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(exportJson) });
    await page.getByTestId('import-confirm').scrollIntoViewIfNeeded();
    await shot('import-confirm');
    await page.getByTestId('import-cancel').click();
  }
});
