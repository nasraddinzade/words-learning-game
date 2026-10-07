interface Props {
  label: string;
  checked: boolean;
  onChange(value: boolean): void;
  testId?: string;
}

export function Toggle({ label, checked, onChange, testId }: Props) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-4 py-1">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-2 border border-border'}`}
      >
        <span
          className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-bg transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`}
        />
      </button>
    </label>
  );
}
