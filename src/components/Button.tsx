import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink shadow-glow font-bold',
  secondary: 'bg-surface-2 text-text border border-border',
  ghost: 'bg-transparent text-muted',
  danger: 'bg-danger/15 text-danger border border-danger/40',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'lg';
}

/** All buttons are at least 48px tall (SPEC §12). */
export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: Props) {
  const sizing = size === 'lg' ? 'min-h-14 text-lg px-6' : 'min-h-12 text-base px-4';
  return (
    <button
      type="button"
      className={`rounded-2xl select-none active:scale-[0.97] transition-transform disabled:opacity-40 disabled:active:scale-100 ${sizing} ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}
