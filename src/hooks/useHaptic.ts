import { useCallback } from "react";
import { hapticFeedback } from "@/lib/haptic";

/**
 * Returns a click handler that triggers haptic feedback before calling the original handler.
 */
export function useHaptic<T extends (...args: any[]) => any>(handler?: T): T {
  return useCallback(
    ((...args: any[]) => {
      hapticFeedback();
      return handler?.(...args);
    }) as unknown as T,
    [handler]
  );
}
