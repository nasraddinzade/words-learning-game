import { expect, test } from '@playwright/test';
import { APP_PATH, openFresh } from './helpers';
import { continueCard, readProgress, startGame, tapCorrect, tapWrong } from './game';

test.describe('export and import (SPEC 10)', () => {
  test('export, reset, import: progress and settings come back; a broken file is refused', async ({ page }) => {
    // Some progress, one flagged card, a changed setting.
    await startGame(page, { seed: 'xfer', newPerGame: 10 });
    const first = await tapCorrect(page);
    await page.getByTestId('bad-card').click();
    await continueCard(page);
    await tapWrong(page);
    await continueCard(page);
    await page.getByTestId('pause').click();
    await page.getByTestId('quit').click();
    await page.goto(`${APP_PATH}#/settings`);
    await page.getByTestId('toggle-sound').click();
    await expect(page.getByTestId('toggle-sound')).toHaveAttribute('aria-checked', 'false');
    const before = await readProgress(page);
    expect(Object.keys(before)).toHaveLength(2);

    // Export → a JSON download.
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^words-progress-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await download.path();
    const text = (await import('node:fs')).readFileSync(path!, 'utf8');
    const file = JSON.parse(text);
    expect(file.app).toBe('words-learning-game');
    expect(file.version).toBe(1);
    expect(file.progress).toHaveLength(2);
    expect(file.flagged).toEqual([first.correctId]);
    expect(file.profile.settings.sound).toBe(false);
    await expect(page.getByTestId('transfer-notice')).toContainText('Saved words-progress-');

    // Reset the device.
    page.once('dialog', (d) => void d.accept());
    await page.getByTestId('dev-toggle').click();
    await page.getByTestId('dev-reset').click();
    await page.getByTestId('dev-toggle').click();
    await page.reload();
    expect(Object.keys(await readProgress(page))).toHaveLength(0);
    await expect(page.getByTestId('toggle-sound')).toHaveAttribute('aria-checked', 'true');

    // A broken file and a foreign file give readable errors and change nothing.
    await page.getByTestId('import-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{ not json') });
    await expect(page.getByTestId('import-error')).toContainText('not valid JSON');
    await page.getByTestId('import-file').setInputFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'something-else', version: 1 })) });
    await expect(page.getByTestId('import-error')).toContainText('not exported by Words Learning Game');
    await page.getByTestId('import-file').setInputFiles({
      name: 'bad-row.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...file, progress: [{ wordId: 'x', step: 9 }] })),
    });
    await expect(page.getByTestId('import-error')).toContainText('row 1');
    expect(Object.keys(await readProgress(page))).toHaveLength(0);

    // The real file: preview shows both counts, Cancel changes nothing, Replace restores.
    await page.getByTestId('import-file').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(text) });
    await expect(page.getByTestId('import-confirm')).toBeVisible();
    await expect(page.getByTestId('import-file-learned')).toContainText('0 learned, 2 words');
    await expect(page.getByTestId('import-device-learned')).toContainText('0 learned');
    await page.getByTestId('import-cancel').click();
    expect(Object.keys(await readProgress(page))).toHaveLength(0);
    await page.getByTestId('import-file').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(text) });
    await page.getByTestId('import-confirm-button').click();
    await expect(page.getByTestId('transfer-notice')).toContainText('Imported');
    const after = await readProgress(page);
    expect(after).toEqual(before);
    await expect(page.getByTestId('toggle-sound')).toHaveAttribute('aria-checked', 'false');
    await page.reload();
    expect(await readProgress(page)).toEqual(before);
    await expect(page.getByTestId('toggle-sound')).toHaveAttribute('aria-checked', 'false');
  });

  test('import shows what will be replaced when the device has more', async ({ page }) => {
    await openFresh(page);
    await page.getByTestId('dev-toggle').click();
    await page.getByTestId('dev-learned-n').fill('50');
    await page.getByTestId('dev-learned-set').click();
    await page.getByTestId('dev-toggle').click();
    await page.goto(`${APP_PATH}#/settings`);
    const file = {
      app: 'words-learning-game',
      version: 1,
      exportedAt: '2026-10-01T10:00:00.000Z',
      profile: { learnedCount: 7, streak: 2, freezes: 0, lastPlayedDay: '2026-10-01', bestCombo: 3, bestScore: 900, unlockedThemes: ['neon'], theme: 'neon', settings: { startLevel: 'B1', newPerGame: 15, sound: true, vibration: true, autoSpeak: false, voice: null } },
      progress: [],
      flagged: [],
    };
    await page.getByTestId('import-file').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
    await expect(page.getByTestId('import-file-learned')).toContainText('7 learned, 0 words');
    await expect(page.getByTestId('import-device-learned')).toContainText('50 learned');
    await page.getByTestId('import-confirm-button').click();
    await expect(page.getByTestId('transfer-notice')).toContainText('Imported');
    await page.goto(`${APP_PATH}#/`);
    await expect(page.getByTestId('learned-count')).toContainText('7 / 10 000');
    await expect(page.getByTestId('streak')).toContainText('2');
  });
});
