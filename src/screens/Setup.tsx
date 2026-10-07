import { useNav } from '@/app/nav';
import { Button } from '@/components/Button';
import { LearningSettings } from '@/components/LearningSettings';
import { Screen } from '@/components/Screen';

export function Setup() {
  const go = useNav((s) => s.go);
  return (
    <Screen testId="screen-setup" title="Game setup" back>
      <LearningSettings />
      <div className="mt-auto pt-6">
        <Button variant="primary" size="lg" className="w-full" data-testid="start-game" onClick={() => go('game')}>
          Start game
        </Button>
      </div>
    </Screen>
  );
}
