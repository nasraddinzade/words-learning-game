import { Screen } from '@/components/Screen';

export function SpeedCheck() {
  return (
    <Screen testId="screen-speed" title="Speed check" back>
      <p className="text-muted">
        Fast typing rounds for words below your start level. Arrives in stage 2.
      </p>
    </Screen>
  );
}
