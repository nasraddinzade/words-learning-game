/**
 * Dev tools (`?seed=`, `?speed=`, dev panel) exist in `vite dev` and in the e2e build
 * (`VITE_DEV_TOOLS=1`), never in the production build (SPEC §13).
 */
export function isDevToolsEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === '1';
}
