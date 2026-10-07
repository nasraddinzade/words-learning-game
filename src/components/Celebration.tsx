import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useProfile, type Celebration as CelebrationItem } from '@/app/profileStore';
import { playCelebration } from '@/app/sound';
import { HAPTIC, vibrate } from '@/app/haptics';
import { formatCount } from '@/app/format';
import { Button } from './Button';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fire(big: boolean): void {
  if (reducedMotion()) return;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#38f0c8';
  const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#ff5ea8';
  const colors = [accent, accent2, '#ffffff'];
  void confetti({ particleCount: big ? 160 : 90, spread: big ? 100 : 70, origin: { y: 0.6 }, colors, disableForReducedMotion: true });
  if (big) {
    setTimeout(() => void confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250);
    setTimeout(() => void confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 400);
  }
}

/** Full-screen celebration for every 100 and every 1 000 learned words (SPEC §8.2). */
export function Celebration({ item }: { item: CelebrationItem }) {
  const dismiss = useProfile((s) => s.dismissCelebration);
  const update = useProfile((s) => s.update);
  const big = item.kind === 'thousand';

  useEffect(() => {
    fire(big);
    playCelebration();
    vibrate(HAPTIC.celebration);
  }, [big, item]);

  return (
    <div
      data-testid="celebration"
      data-kind={item.kind}
      className="fixed inset-0 z-[60] mx-auto flex max-w-[480px] flex-col items-center justify-center gap-6 bg-bg/90 px-6 text-center"
    >
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-accent">{big ? 'Milestone' : 'Nice'}</p>
      <p className="animate-pop text-6xl font-black tabular-nums" data-testid="celebration-value">{formatCount(item.value)}</p>
      <p className="text-xl text-muted">words learned</p>
      {item.kind === 'thousand' ? (
        <>
          <p className="text-lg">
            New theme unlocked: <span className="font-bold text-accent">{item.themeName}</span>
          </p>
          <div className="grid w-full gap-3">
            <Button
              variant="primary"
              size="lg"
              data-testid="celebration-try-theme"
              onClick={() => {
                void update({ theme: item.themeId });
                dismiss();
              }}
            >
              Try it
            </Button>
            <Button data-testid="celebration-dismiss" onClick={dismiss}>Later</Button>
          </div>
        </>
      ) : (
        <Button variant="primary" size="lg" data-testid="celebration-dismiss" onClick={dismiss}>Keep going</Button>
      )}
    </div>
  );
}
