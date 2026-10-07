/**
 * Every tuning number of the arcade lives here (SPEC §5.5). Expect to adjust after live play.
 * Stage 0 only defines the layout constants the stub screens need; stage 1 fills in the rest.
 */
export const BALANCE = {
  lanes: 3,
  startWords: 3,
  maxWords: 6,
  /** Time for a word to fall through the field in a tap round, ms. */
  fallMsTap: 9_000,
  /** Typing rounds fall slower (SPEC §5.2). */
  fallMsType: 14_000,
  lives: 3,
} as const;
