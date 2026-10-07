import { expect, type Page } from '@playwright/test';
import { APP_PATH, DB_NAME, openFresh } from './helpers';

export interface RoundView {
  correctId: string;
  options: Array<{ id: string; word: string }>;
}

export async function startGame(page: Page, opts: { seed?: string; speed?: number; newPerGame?: 5 | 10 | 15 | 20; fresh?: boolean } = {}): Promise<void> {
  const query = `?seed=${opts.seed ?? 'e2e'}&speed=${opts.speed ?? 2}`;
  if (opts.fresh !== false) await openFresh(page, query);
  else {
    await page.goto(APP_PATH + query);
    await expect(page.getByTestId('screen-home')).toBeVisible();
  }
  await page.getByTestId('play').click();
  await expect(page.getByTestId('screen-setup')).toBeVisible();
  if (opts.newPerGame) await page.getByRole('radiogroup', { name: 'New words per game' }).getByRole('radio', { name: String(opts.newPerGame), exact: true }).click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('screen-game')).toBeVisible();
}

/** Waits for the round's chips to exist and returns what is on the field. */
export async function readRound(page: Page): Promise<RoundView> {
  const chips = page.getByTestId('falling-word');
  await expect(chips.first()).toBeAttached();
  const correctId = await page.locator('[data-testid="falling-word"][data-correct="true"]').getAttribute('data-word-id');
  const options = await chips.evaluateAll((els) => els.map((el) => ({ id: el.getAttribute('data-word-id') ?? '', word: el.textContent?.trim() ?? '' })));
  if (!correctId) throw new Error('no data-correct chip: dev tools missing?');
  return { correctId, options };
}

async function tapChip(page: Page, id: string): Promise<void> {
  const chip = page.locator(`[data-testid="falling-word"][data-word-id="${id}"]`);
  await expect(chip).toHaveCSS('opacity', '1');
  // Chips move every frame, so Playwright's stability check would never pass.
  await chip.click({ force: true });
  await expect(page.getByTestId('card-overlay')).toBeVisible();
}

export async function tapCorrect(page: Page): Promise<RoundView> {
  const round = await readRound(page);
  await tapChip(page, round.correctId);
  await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'correct');
  return round;
}

export async function tapWrong(page: Page): Promise<RoundView & { wrongId: string }> {
  const round = await readRound(page);
  const wrong = round.options.find((o) => o.id !== round.correctId);
  if (!wrong) throw new Error('no distractor on the field');
  await tapChip(page, wrong.id);
  await expect(page.getByTestId('word-card')).toHaveAttribute('data-verdict', 'wrong');
  return { ...round, wrongId: wrong.id };
}

export async function continueCard(page: Page): Promise<void> {
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('card-overlay')).toHaveCount(0);
}

export interface ProgressRow {
  wordId: string;
  step: number;
  status: string;
  dueDay: string | null;
  lastAdvanceDay: string | null;
  inDebt: boolean;
  lapses: number;
  confusedWith: string[];
  flagged: boolean;
}

export async function readProgress(page: Page): Promise<Record<string, ProgressRow>> {
  const rows = await page.evaluate(
    (dbName) =>
      new Promise<ProgressRow[]>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('progress', 'readonly');
          const all = tx.objectStore('progress').getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result as ProgressRow[]);
          };
          all.onerror = () => reject(all.error);
        };
      }),
    DB_NAME,
  );
  return Object.fromEntries(rows.map((r) => [r.wordId, r]));
}

/** Writes progress rows straight into IndexedDB (to simulate history without playing it). */
export async function writeProgress(page: Page, rows: ProgressRow[]): Promise<void> {
  await page.evaluate(
    ({ dbName, rows }) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('progress', 'readwrite');
          const store = tx.objectStore('progress');
          for (const r of rows) store.put({ skipCandidate: false, learnedDay: null, checksPassed: 0, ...r });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { dbName: DB_NAME, rows },
  );
}

export async function shiftDay(page: Page, days: number): Promise<void> {
  await page.evaluate((d) => {
    const cur = Number(localStorage.getItem('wlg.dev.dayOffset') ?? '0');
    localStorage.setItem('wlg.dev.dayOffset', String(cur + d));
  }, days);
}

export const localDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
