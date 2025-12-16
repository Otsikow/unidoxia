import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

/**
 * Optimized query hook with built-in caching and performance enhancements
 */
export function useOptimizedQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    "queryKey" | "queryFn"
  >
) {
  // Memoize query function to prevent unnecessary recreations
  const memoizedQueryFn = useCallback(queryFn, [queryFn]);

  // Optimize query options
  const optimizedOptions = useMemo(
    () => ({
      ...options,
      // Default to not refetching on mount if data is fresh
      refetchOnMount: options?.refetchOnMount ?? false,
      // Structural sharing for better performance
      structuralSharing: options?.structuralSharing ?? true,
      // Keep data in cache longer
      gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes
      // Data is fresh for 5 minutes
      staleTime: options?.staleTime ?? 5 * 60 * 1000,
    }),
    [options]
  );

  return useQuery({
    queryKey,
    queryFn: memoizedQueryFn,
    ...optimizedOptions,
  });
}

/**
 * Hook for paginated queries with optimized performance
 */
export function useOptimizedPaginatedQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    "queryKey" | "queryFn"
  >
) {
  return useOptimizedQuery(queryKey, queryFn, {
    ...options,
    // Keep previous data while fetching new page
    placeholderData: (previousData) => previousData as any,
    // Longer stale time for paginated data
    staleTime: options?.staleTime ?? 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for infinite queries with optimized performance
 */
export function useOptimizedInfiniteQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryKey: TQueryKey,
  queryFn: ({ pageParam }: { pageParam?: any }) => Promise<TQueryFnData>,
  getNextPageParam: (lastPage: TQueryFnData) => any,
  options?: any
) {
  const memoizedQueryFn = useCallback(queryFn, [queryFn]);
  const memoizedGetNextPageParam = useCallback(getNextPageParam, [getNextPageParam]);

  return useQuery({
    queryKey,
    queryFn: memoizedQueryFn,
    ...options,
    getNextPageParam: memoizedGetNextPageParam,
    // Keep previous data while fetching
    placeholderData: (previousData: any) => previousData,
    // Structural sharing
    structuralSharing: true,
  });
}
