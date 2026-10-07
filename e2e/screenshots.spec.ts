import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { APP_PATH, openFresh } from './helpers';

/**
 * Captures every screen for the verification report (SPEC §13 step 3). Screenshots land in
 * docs/verification/screenshots/<stage>/<project>-<screen>.png and are looked at by a human (or
 * Claude) before a stage is called done.
 */
const STAGE = process.env.STAGE ?? 'stage-0';
const DIR = `docs/verification/screenshots/${STAGE}`;

test('capture all screens', async ({ page }, testInfo) => {
  mkdirSync(DIR, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: `${DIR}/${testInfo.project.name}-${name}.png`, scale: 'css', fullPage: false });

  await openFresh(page);
  await shot('home');
  await page.goto(`${APP_PATH}#/setup`);
  await shot('setup');
  await page.goto(`${APP_PATH}#/game`);
  await shot('game');
  await page.goto(`${APP_PATH}#/card`);
  await shot('card');
  await page.getByTestId('show-translation').click();
  await shot('card-translation');
  await page.goto(`${APP_PATH}#/summary`);
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
