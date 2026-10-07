import { useEffect, useState } from 'react';

/**
 * Height of the visual viewport in px. When the on-screen keyboard opens the layout viewport
 * may not shrink (iOS), but the visual one does; game screens size themselves to it so the
 * explanation and the falling word stay visible (SPEC §5.2).
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() => (typeof window === 'undefined' ? null : window.visualViewport?.height ?? null));
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setHeight(vv.height);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return height;
}

/** Attributes that silence the keyboard's helpers in a spelling test (SPEC §5.2). */
export const TYPING_INPUT_ATTRS = {
  autoCorrect: 'off',
  autoCapitalize: 'off',
  autoComplete: 'off',
  spellCheck: false,
  inputMode: 'text',
  enterKeyHint: 'done',
} as const;
