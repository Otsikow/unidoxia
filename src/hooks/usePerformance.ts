import { useCallback, useEffect, useRef, useState, useMemo } from "react";

/**
 * Performance-focused hooks for React applications
 */

/**
 * useStableCallback - Returns a stable callback reference that always calls the latest function
 * Use this to avoid re-renders when passing callbacks to memoized children
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);

  // Update ref on every render
  callbackRef.current = callback;

  // Return stable callback
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * useDeferredRender - Defer rendering of heavy components until after paint
 * Great for below-the-fold content
 */
export function useDeferredRender(delay: number = 0): boolean {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (delay === 0) {
      // Use requestIdleCallback for non-blocking render
      if ("requestIdleCallback" in window) {
        const id = (window as any).requestIdleCallback(() => setShouldRender(true), {
          timeout: 100,
        });
        return () => (window as any).cancelIdleCallback?.(id);
      }
      // Fallback: next frame
      const rafId = requestAnimationFrame(() => setShouldRender(true));
      return () => cancelAnimationFrame(rafId);
    }

    const timeoutId = setTimeout(() => setShouldRender(true), delay);
    return () => clearTimeout(timeoutId);
  }, [delay]);

  return shouldRender;
}

/**
 * useIntersectionObserver - Only render content when it enters viewport
 * Perfect for lazy loading sections
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Once visible, stop observing
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px", // Start loading 100px before visible
        threshold: 0,
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);

  return [ref, isIntersecting];
}

/**
 * useDebounce - Debounce a value with configurable delay
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle - Throttle a value with configurable interval
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timeoutId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * usePrevious - Get the previous value of a state
 * Useful for comparing changes without triggering re-renders
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useIsMounted - Check if component is still mounted
 * Prevents state updates on unmounted components
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * useNetworkStatus - Check if user is on a slow connection
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  isSlowConnection: boolean;
  saveData: boolean;
} {
  const [status, setStatus] = useState(() => {
    if (typeof window === "undefined") {
      return { isOnline: true, isSlowConnection: false, saveData: false };
    }

    const conn = (navigator as any).connection;
    return {
      isOnline: navigator.onLine,
      isSlowConnection: ["slow-2g", "2g"].includes(conn?.effectiveType ?? ""),
      saveData: Boolean(conn?.saveData),
    };
  });

  useEffect(() => {
    const handleOnline = () => setStatus((s) => ({ ...s, isOnline: true }));
    const handleOffline = () => setStatus((s) => ({ ...s, isOnline: false }));
    const handleConnectionChange = () => {
      const conn = (navigator as any).connection;
      setStatus((s) => ({
        ...s,
        isSlowConnection: ["slow-2g", "2g"].includes(conn?.effectiveType ?? ""),
        saveData: Boolean(conn?.saveData),
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    (navigator as any).connection?.addEventListener("change", handleConnectionChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      (navigator as any).connection?.removeEventListener("change", handleConnectionChange);
    };
  }, []);

  return status;
}

/**
 * useReducedMotion - Check if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * useMemoCompare - Like useMemo, but with custom comparison
 * Useful for preventing re-renders when object references change but values don't
 */
export function useMemoCompare<T>(
  value: T,
  compare: (prev: T | undefined, next: T) => boolean
): T {
  const ref = useRef<T>();

  if (!compare(ref.current, value)) {
    ref.current = value;
  }

  return ref.current as T;
}

/**
 * useIdleCallback - Run expensive operations during browser idle time
 */
export function useIdleCallback(
  callback: () => void,
  options: { timeout?: number; enabled?: boolean } = {}
): void {
  const { timeout = 1000, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(callback, { timeout });
      return () => (window as any).cancelIdleCallback?.(id);
    }

    // Fallback for browsers without requestIdleCallback
    const timeoutId = setTimeout(callback, 0);
    return () => clearTimeout(timeoutId);
  }, [callback, timeout, enabled]);
}

/**
 * useEventCallback - Similar to useStableCallback but for event handlers
 * Optimized for high-frequency events like scroll, mousemove
 */
export function useEventCallback<E extends Event>(
  handler: (event: E) => void
): (event: E) => void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((event: E) => {
    handlerRef.current(event);
  }, []);
}

/**
 * useRafCallback - Throttle callbacks to animation frame rate
 * Perfect for scroll handlers and animations
 */
export function useRafCallback<T extends (...args: any[]) => any>(callback: T): T {
  const rafId = useRef<number>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: Parameters<T>) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      callbackRef.current(...args);
    });
  }, []) as T;
}

export default {
  useStableCallback,
  useDeferredRender,
  useIntersectionObserver,
  useDebounce,
  useThrottle,
  usePrevious,
  useIsMounted,
  useNetworkStatus,
  useReducedMotion,
  useMemoCompare,
  useIdleCallback,
  useEventCallback,
  useRafCallback,
};
