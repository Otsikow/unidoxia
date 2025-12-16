/**
 * Performance utilities for UniDoxia
 * Includes monitoring, optimization helpers, and performance metrics
 */

/**
 * Report Web Vitals to analytics
 */
export const reportWebVitals = (metric: any) => {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(metric);
  }
  
  // In production, send to analytics service
  // Example: sendToAnalytics(metric)
};

/**
 * Prefetch helper with network conditions check
 */
export const canPrefetch = (): boolean => {
  if (typeof navigator === "undefined") return false;
  
  const conn = (navigator as any).connection;
  if (!conn) return true;
  
  // Don't prefetch on slow connections or data saver mode
  if (conn.saveData) return false;
  if (["slow-2g", "2g"].includes(conn.effectiveType)) return false;
  
  return true;
};

/**
 * Schedule work for idle time
 */
export const scheduleIdleTask = (callback: () => void, timeout = 2000) => {
  if ("requestIdleCallback" in window) {
    return (window as any).requestIdleCallback(callback, { timeout });
  }
  return setTimeout(callback, timeout);
};

/**
 * Cancel idle task
 */
export const cancelIdleTask = (id: number) => {
  if ("cancelIdleCallback" in window) {
    (window as any).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Measure component render time
 */
export const measureRender = (componentName: string, callback: () => void) => {
  const start = performance.now();
  callback();
  const end = performance.now();
  const duration = end - start;
  
  if (import.meta.env.DEV && duration > 16) {
    console.warn(`⚠️ ${componentName} took ${duration.toFixed(2)}ms to render (>16ms)`);
  }
  
  return duration;
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Image preloader with intersection observer
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Check if element is in viewport
 */
export const isInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};
