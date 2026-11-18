/**
 * The lens intro and the companion meet here: the intro waits until the companion can
 * speak, and the companion greets once the visitor has entered (that click is also what
 * lets the browser play sound).
 */
export const INTRO_ENTER = "timeblind:enter";
export const COMPANION_READY = "timeblind:companion-ready";

export const introState = { entered: false, companionReady: false };

export function announceCompanionReady() {
  introState.companionReady = true;
  window.dispatchEvent(new Event(COMPANION_READY));
}

/** call inside the click / key handler, so listeners run within the user gesture */
export function announceEnter() {
  introState.entered = true;
  window.dispatchEvent(new Event(INTRO_ENTER));
}
