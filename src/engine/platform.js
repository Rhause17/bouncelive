/**
 * Platform detection and Safari-specific workarounds.
 */
export const IS_SAFARI = (() => {
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edgios|opera|opr/i.test(ua);
})();
