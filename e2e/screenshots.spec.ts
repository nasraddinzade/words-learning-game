import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { APP_PATH, openFresh } from './helpers';
import { continueCard, readRound, startGame, tapCorrect, tapWrong } from './game';

/**
 * Captures every screen and game state for the verification report (SPEC §13 step 3).
 * Files land in docs/verification/screenshots/<stage>/<project>-<name>.png.
 */
const STAGE = process.env.STAGE ?? 'stage-1';
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

  await page.goto(`${APP_PATH}#/`);
  await page.getByTestId('dev-toggle').click();
  await page.getByTestId('dev-learned-n').fill('1234');
  await page.getByTestId('dev-learned-set').click();
  await shot('dev-panel');
  await page.goto(`${APP_PATH}#/map`);
  await shot('map');
  await page.goto(`${APP_PATH}#/speed`);
  await shot('speed');
  await page.goto(`${APP_PATH}#/settings`);
  await shot('settings');
});
