import { flushSync } from "react-dom";

/**
 * Run a React state update inside a browser View Transition so the old and
 * new DOM cross-fade per the keyframes defined in app/globals.css.
 * Falls back to an instant update on browsers without the API.
 */
export function withViewTransition(update: () => void) {
  if (typeof document === "undefined") {
    update();
    return;
  }
  const d = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  if (d.startViewTransition) {
    d.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}
