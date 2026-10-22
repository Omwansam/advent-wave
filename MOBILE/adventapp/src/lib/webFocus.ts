import { Platform } from 'react-native';

const PRESSABLE = 'button, a, [role="button"], [role="link"], [role="tab"]';

/**
 * The web build only. React Navigation hides a screen that leaves the front with `aria-hidden`.
 * A button that navigated keeps focus, so the browser is asked to hide the element holding
 * focus — it refuses and warns ("Blocked aria-hidden on an element because its descendant
 * retained focus"), and a screen reader is left on something no longer on screen. Letting go of
 * focus as a click lands, before the app's own handler runs, keeps it out of the hidden screen.
 *
 * Only pointer clicks (`detail > 0`): a keyboard user activating a button keeps their place.
 * Returns the function that stops listening.
 */
export function releaseFocusOnClick(): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return () => undefined;
  const onClick = (event: MouseEvent) => {
    if (event.detail === 0) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && active.matches(PRESSABLE)) active.blur();
  };
  // Capture on the document runs before React's listener on the app's root.
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
