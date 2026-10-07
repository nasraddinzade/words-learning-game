import { useEffect, useState } from 'react';
import type { WordEntry } from '@/content/types';
import { useProfile } from '@/app/profileStore';
import { speak, stopSpeaking } from '@/app/speech';
import { plainSentence as toPlain, splitSentence } from '@/app/sentence';
import { Button } from './Button';

export type CardVerdict = 'correct' | 'wrong' | 'missed' | 'review';

interface Props {
  entry: WordEntry;
  verdict: CardVerdict;
  /** What the player tapped instead (wrong taps only). */
  chosen?: WordEntry | null;
  flagged: boolean;
  onToggleFlag(): void;
  onContinue(): void;
  continueLabel?: string;
}

const HEADLINE: Record<CardVerdict, { text: string; cls: string }> = {
  correct: { text: 'Correct!', cls: 'text-ok' },
  wrong: { text: 'Not this one. The word was', cls: 'text-danger' },
  missed: { text: 'Too slow. The word was', cls: 'text-danger' },
  review: { text: 'Word card', cls: 'text-muted' },
};

/**
 * The pause card after an answer (SPEC §5.3, §5.4). Russian appears only in the translation.
 * Mount it with `key={entry.id}` so the translation is hidden again for every new word.
 */
export function WordCard({ entry, verdict, chosen, flagged, onToggleFlag, onContinue, continueLabel = 'Continue' }: Props) {
  const [showTranslation, setShowTranslation] = useState(false);
  const settings = useProfile((s) => s.profile.settings);
  const { before, hit, after } = splitSentence(entry.sentence);
  const plainSentence = toPlain(entry.sentence);

  useEffect(() => {
    if (settings.autoSpeak && verdict !== 'review') speak([entry.word, plainSentence], settings.voice);
    return () => stopSpeaking();
  }, [entry.id, entry.word, plainSentence, settings.autoSpeak, settings.voice, verdict]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  const head = HEADLINE[verdict];
  return (
    <div data-testid="word-card" data-verdict={verdict} className="flex flex-1 flex-col justify-center gap-5 px-4 py-6">
      <p className={`text-center text-sm font-bold uppercase tracking-wide ${head.cls}`} data-testid="card-verdict">
        {head.text}
      </p>
      <header className="text-center">
        <p className="text-5xl font-black tracking-tight" data-testid="card-word">{entry.word}</p>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-muted">{entry.pos}</p>
        {verdict === 'wrong' && chosen && (
          <p className="mt-2 text-sm text-muted" data-testid="card-chosen">
            You tapped <span className="font-semibold text-danger line-through">{chosen.word}</span>
          </p>
        )}
      </header>

      <p className="rounded-2xl border border-border bg-surface p-4 text-xl leading-snug" data-testid="card-sentence">
        {before}
        <mark className="rounded bg-accent/25 px-1 text-accent">{hit}</mark>
        {after}
      </p>

      {showTranslation ? (
        <p data-testid="translation" lang="ru" className="px-1 text-lg text-muted">{entry.translation}</p>
      ) : (
        <Button data-testid="show-translation" onClick={() => setShowTranslation(true)}>Show translation</Button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button aria-label="Replay sound" data-testid="replay" onClick={() => speak([entry.word, plainSentence], settings.voice)}>
          🔊 Replay
        </Button>
        <Button variant="danger" data-testid="bad-card" aria-pressed={flagged} onClick={onToggleFlag} className={flagged ? 'bg-danger/40' : ''}>
          {flagged ? 'Flagged' : 'Bad card'}
        </Button>
      </div>
      <Button variant="primary" size="lg" data-testid="continue" onClick={onContinue} autoFocus>
        {continueLabel}
      </Button>
    </div>
  );
}
