import Dexie, { type EntityTable } from 'dexie';
import type { WordProgress, Profile } from '@/types/progress';
import { defaultProfile } from '@/types/progress';

export type ProfileRow = Profile & { id: 'me' };

export class WordsDB extends Dexie {
  progress!: EntityTable<WordProgress, 'wordId'>;
  profile!: EntityTable<ProfileRow, 'id'>;

  constructor(name = 'words-learning-game') {
    super(name);
    this.version(1).stores({
      progress: 'wordId, status, dueDay',
      profile: 'id',
    });
  }
}

export const db = new WordsDB();

export async function loadProfile(): Promise<Profile> {
  const row = await db.profile.get('me');
  if (!row) return defaultProfile();
  const { id: _id, ...profile } = row;
  // Fill in fields added after the row was written.
  const base = defaultProfile();
  return { ...base, ...profile, settings: { ...base.settings, ...profile.settings } };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await db.profile.put({ ...profile, id: 'me' });
}

/** Wipes everything the player has done. Used by the dev panel and, later, by import. */
export async function resetAllData(): Promise<void> {
  await db.transaction('rw', db.progress, db.profile, async () => {
    await db.progress.clear();
    await db.profile.clear();
  });
}
