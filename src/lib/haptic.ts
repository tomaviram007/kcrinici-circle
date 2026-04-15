/**
 * Trigger haptic feedback (vibration) on supported devices.
 * Falls back silently on unsupported browsers/desktop.
 */
export const hapticFeedback = (duration: number = 15) => {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  } catch {
    // Silently fail on unsupported devices
  }
};
