import { MANIFEST } from './index';
import type { Level, WordEntry } from './types';

const modules = import.meta.glob<{ default: WordEntry[] }>('./words/*.json');
const cache = new Map<string, Promise<WordEntry[]>>();

/** Loads one batch file (`04001-04500`) once; later calls reuse the promise. */
export function loadBatch(file: string): Promise<WordEntry[]> {
  let p = cache.get(file);
  if (!p) {
    const importer = modules[`./words/${file}.json`];
    if (!importer) return Promise.reject(new Error(`Unknown word batch: ${file}`));
    p = importer().then((m) => m.default);
    cache.set(file, p);
  }
  return p;
}

let indexPromise: Promise<Record<string, string>> | null = null;
/** id → batch file, generated alongside the manifest. Loaded on demand (one small JSON). */
export function loadWordIndex(): Promise<Record<string, string>> {
  indexPromise ??= import('./word-index.json').then((m) => m.default as Record<string, string>);
  return indexPromise;
}

/** Loads every batch that holds one of `ids`; returns all entries of those batches (the distractor pool). */
export async function loadEntriesFor(ids: Iterable<string>): Promise<{ entries: Map<string, WordEntry>; pool: WordEntry[] }> {
  const index = await loadWordIndex();
  const files = new Set<string>();
  for (const id of ids) {
    const file = index[id];
    if (file) files.add(file);
  }
  const batches = await Promise.all([...files].map((f) => loadBatch(f)));
  const pool = batches.flat();
  return { entries: new Map(pool.map((e) => [e.id, e])), pool };
}

/**
 * Warms the cache for the batches that follow the ones in use, when the browser is idle
 * (SPEC §9.1). The service worker precaches every batch at install anyway; this only saves the
 * first parse on the next game.
 */
export function prefetchNextBatches(usedFiles: Iterable<string>, count = 1): void {
  if (typeof window === 'undefined') return;
  const used = new Set(usedFiles);
  const ordered = MANIFEST.map((b) => b.file);
  const lastUsed = Math.max(-1, ...ordered.map((f, i) => (used.has(f) ? i : -1)));
  const next = ordered.slice(lastUsed + 1, lastUsed + 1 + count).filter((f) => !used.has(f));
  if (next.length === 0) return;
  const run = () => next.forEach((f) => void loadBatch(f).catch(() => undefined));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 5000 });
  else setTimeout(run, 1000);
}

/** Batch files that hold any of `ids` (after loadWordIndex). */
export async function filesFor(ids: Iterable<string>): Promise<Set<string>> {
  const index = await loadWordIndex();
  const files = new Set<string>();
  for (const id of ids) {
    const f = index[id];
    if (f) files.add(f);
  }
  return files;
}

/** Unseen words of the given levels by rank (Speed check pool, SPEC §7). */
export async function pickUnseenOfLevels(levels: readonly Level[], seen: ReadonlySet<string>, limit: number): Promise<string[]> {
  return pickFreshCandidates(levels, seen, limit);
}

/**
 * New words for a game: the start level by rank, then the levels in `order` (SPEC §3).
 * Only loads batches that contain words of the level being searched.
 */
export async function pickFreshCandidates(order: readonly Level[], seen: ReadonlySet<string>, limit: number): Promise<string[]> {
  const out: string[] = [];
  for (const level of order) {
    if (out.length >= limit) break;
    const batches = MANIFEST.filter((b) => (b.levels[level] ?? 0) > 0).sort((a, b) => a.from - b.from);
    for (const b of batches) {
      if (out.length >= limit) break;
      const entries = await loadBatch(b.file);
      const fresh = entries.filter((e) => e.level === level && !seen.has(e.id)).sort((x, y) => x.rank - y.rank);
      for (const e of fresh) {
        if (out.length >= limit) break;
        out.push(e.id);
      }
    }
  }
  return out;
}
