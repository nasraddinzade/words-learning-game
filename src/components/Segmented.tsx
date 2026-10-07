interface Props<T extends string | number> {
  label: string;
  options: readonly T[];
  value: T;
  onChange(value: T): void;
  render?(option: T): string;
  testId?: string;
}

export function Segmented<T extends string | number>({ label, options, value, onChange, render, testId }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} data-testid={testId} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt)}
            className={`min-h-12 rounded-xl border px-1 text-base font-semibold transition-colors ${
              selected ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-surface text-muted'
            }`}
          >
            {render ? render(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}
