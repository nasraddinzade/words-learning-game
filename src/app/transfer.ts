import { db, replaceAllData } from '@/db/db';
import { buildExport, parseImport, type ExportFile } from '@/engine/transfer';
import { useProfile } from './profileStore';

export function exportFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `words-progress-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Builds the export JSON from the stored profile and progress (SPEC §10). */
export async function buildExportJson(now = new Date()): Promise<{ json: string; fileName: string; file: ExportFile }> {
  const progress = await db.progress.toArray();
  const file = buildExport(useProfile.getState().profile, progress, now.toISOString());
  return { json: JSON.stringify(file, null, 2), fileName: exportFileName(now), file };
}

/** Triggers a browser download of the export file. */
export function downloadText(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ImportPreview = { ok: true; file: ExportFile; learnedInFile: number; learnedOnDevice: number; wordsInFile: number } | { ok: false; error: string };

/** Reads and validates a chosen file; nothing is written yet. */
export async function previewImport(text: string): Promise<ImportPreview> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  const parsed = parseImport(raw);
  if (!parsed.ok) return parsed;
  return { ok: true, file: parsed.file, learnedInFile: parsed.learnedInFile, learnedOnDevice: useProfile.getState().profile.learnedCount, wordsInFile: parsed.file.progress.length };
}

/** Replaces everything on the device with the file (after the player confirmed). */
export async function applyImport(file: ExportFile): Promise<void> {
  await replaceAllData(file.profile, file.progress);
  await useProfile.getState().init();
}
