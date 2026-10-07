import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { APP_PATH, openFresh } from './helpers';
import { continueCard, learningRow, localDay, readRound, startGame, tapCorrect, tapWrong, untilTyping, writeProgress } from './game';

/**
 * Captures every screen and game state for the verification report (SPEC §13 step 3).
 * Files land in docs/verification/screenshots/<stage>/<project>-<name>.png.
 */
const STAGE = process.env.STAGE ?? 'stage-2';
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
  await shot('dev-panel');
  await page.goto(`${APP_PATH}#/map`);
  await shot('map');
  await page.goto(`${APP_PATH}#/settings`);
  await shot('settings');
});
