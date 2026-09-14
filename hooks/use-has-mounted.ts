import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/**
 * True only once past hydration. `useSyncExternalStore` is the React-
 * recommended idiom for this exact "differs between server and client"
 * signal (a plain `useState`+`useEffect` pair trips this repo's
 * `react-hooks/set-state-in-effect` lint rule for the same reason
 * `hooks/use-elapsed-seconds.ts` avoids it: adjust state during render,
 * don't set it from an effect).
 *
 * Use it to gate anything whose value the server cannot know — the
 * resolved theme, a persisted preference — so the server render and the
 * client's first hydration pass are identical and the real value only
 * swaps in once React is safely past hydration. Lifted out of
 * components/manar/topbar.tsx, which used to hold the only copy, when the
 * preference menus needed the same signal.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
