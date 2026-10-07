import { useState } from 'react';
import { useNav } from '@/app/nav';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';

/** Stage 0 stub with a fixed sample entry. Speech, Bad card and real data come in stage 1. */
export function WordCard() {
  const go = useNav((s) => s.go);
  const [showTranslation, setShowTranslation] = useState(false);
  const sample = {
    word: 'reluctant',
    pos: 'adj',
    before: 'I was ',
    hit: 'reluctant',
    after: ' to tell him the truth.',
    translation: 'Мне не хотелось говорить ему правду.',
  };

  return (
    <Screen testId="screen-card">
      <div className="flex flex-1 flex-col justify-center gap-6 py-6">
        <header className="text-center">
          <p className="text-5xl font-black tracking-tight" data-testid="card-word">{sample.word}</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-muted">{sample.pos}</p>
        </header>

        <p className="rounded-2xl border border-border bg-surface p-4 text-xl leading-snug">
          {sample.before}
          <mark className="rounded bg-accent/25 px-1 text-accent">{sample.hit}</mark>
          {sample.after}
        </p>

        {showTranslation ? (
          <p data-testid="translation" lang="ru" className="px-1 text-lg text-muted">{sample.translation}</p>
        ) : (
          <Button data-testid="show-translation" onClick={() => setShowTranslation(true)}>Show translation</Button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button aria-label="Replay sound" disabled>🔊 Replay</Button>
          <Button variant="danger" data-testid="bad-card" disabled>Bad card</Button>
        </div>
        <Button variant="primary" size="lg" data-testid="continue" onClick={() => go('game')}>
          Continue
        </Button>
      </div>
    </Screen>
  );
}
