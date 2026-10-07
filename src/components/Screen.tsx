import type { ReactNode } from 'react';
import { useNav } from '@/app/nav';
import { Button } from './Button';

interface Props {
  title?: string;
  back?: boolean;
  testId: string;
  children: ReactNode;
  /** Remove the default padding, for the game field. */
  bare?: boolean;
}

export function Screen({ title, back, testId, children, bare }: Props) {
  const go = useNav((s) => s.go);
  return (
    <main
      data-testid={testId}
      className={`flex flex-1 flex-col ${bare ? '' : 'px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]'}`}
    >
      {(title || back) && (
        <header className="mb-3 flex min-h-12 items-center gap-2">
          {back && (
            <Button variant="ghost" aria-label="Back" className="-ml-2 min-w-12" onClick={() => history.length > 1 ? history.back() : go('home')}>
              ←
            </Button>
          )}
          {title && <h1 className="text-xl font-bold">{title}</h1>}
        </header>
      )}
      {children}
    </main>
  );
}
