/**
 * Query optimization utilities for UniDoxia
 * Helps with caching, batching, and selective fetching
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Prefetch multiple queries in parallel
 */
export const prefetchQueries = async (
  queryClient: QueryClient,
  queries: Array<{
    queryKey: any[];
    queryFn: () => Promise<any>;
  }>
) => {
  await Promise.all(
    queries.map(({ queryKey, queryFn }) =>
      queryClient.prefetchQuery({ queryKey, queryFn })
    )
  );
};

/**
 * Batch invalidate multiple queries
 */
export const batchInvalidate = (
  queryClient: QueryClient,
  queryKeys: any[][]
) => {
  queryKeys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
};

/**
 * Optimistic update helper
 */
export const optimisticUpdate = <T>(
  queryClient: QueryClient,
  queryKey: any[],
  updater: (old: T) => T
) => {
  const previousData = queryClient.getQueryData<T>(queryKey);
  
  if (previousData) {
    queryClient.setQueryData<T>(queryKey, updater(previousData));
  }
  
  return previousData;
};

/**
 * Create a deduplicated query key
 */
export const createQueryKey = (...parts: any[]) => {
  return parts.filter(Boolean);
};

/**
 * Check if query data is stale
 */
export const isQueryStale = (
  queryClient: QueryClient,
  queryKey: any[]
): boolean => {
  const query = queryClient.getQueryState(queryKey);
  return !query || query.isInvalidated;
};

/**
 * Selective field fetching helper
 */
export const selectFields = <T extends object, K extends keyof T>(
  data: T | undefined,
  fields: K[]
): Pick<T, K> | undefined => {
  if (!data) return undefined;
  
  const result = {} as Pick<T, K>;
  fields.forEach((field) => {
    if (field in (data as object)) {
      result[field] = data[field];
    }
  });
  
  return result;
};

/**
 * Batch multiple Supabase queries
 */
export const batchSupabaseQueries = async <T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> => {
  return Promise.all(queries.map((query) => query()));
};

/**
 * Cache utilities
 */
export const cacheUtils = {
  /**
   * Set cache with expiry
   */
  set: (key: string, value: any, expiryMs: number) => {
    const item = {
      value,
      expiry: Date.now() + expiryMs,
    };
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.warn("Failed to set cache:", e);
    }
  },

  /**
   * Get cache if not expired
   */
  get: <T>(key: string): T | null => {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return item.value;
    } catch (e) {
      console.warn("Failed to get cache:", e);
      return null;
    }
  },

  /**
   * Clear cache
   */
  clear: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Failed to clear cache:", e);
    }
  },

  /**
   * Clear all caches matching pattern
   */
  clearPattern: (pattern: string) => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn("Failed to clear cache pattern:", e);
    }
  },
};
