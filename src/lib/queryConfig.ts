import { QueryClient } from "@tanstack/react-query";

/**
 * Optimized React Query configuration for performance
 */

// Cache time constants (in milliseconds)
export const CACHE_TIME = {
  /** Data that rarely changes (countries, languages, etc.) */
  STATIC: 30 * 60 * 1000, // 30 minutes
  /** User profile and preferences */
  USER: 10 * 60 * 1000, // 10 minutes
  /** Standard data (applications, documents, etc.) */
  STANDARD: 5 * 60 * 1000, // 5 minutes
  /** Frequently changing data (messages, notifications) */
  DYNAMIC: 1 * 60 * 1000, // 1 minute
  /** Real-time data (active sessions, live updates) */
  REALTIME: 30 * 1000, // 30 seconds
} as const;

// Stale time constants
export const STALE_TIME = {
  /** Immediately stale - always refetch */
  IMMEDIATE: 0,
  /** Short stale time for dynamic data */
  SHORT: 30 * 1000, // 30 seconds
  /** Standard stale time */
  STANDARD: 2 * 60 * 1000, // 2 minutes
  /** Long stale time for static data */
  LONG: 10 * 60 * 1000, // 10 minutes
  /** Never stale - only refetch manually */
  INFINITE: Infinity,
} as const;

/**
 * Create optimized query client with performance settings
 */
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry logic - don't retry on 4xx errors
        retry: (attempt, error) => {
          if (error && typeof error === "object" && "status" in error) {
            const status = (error as any).status;
            // Don't retry on client errors (4xx)
            if (status >= 400 && status < 500) return false;
          }
          // Retry up to 3 times for other errors
          return attempt < 3;
        },
        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Default stale time - data is fresh for 2 minutes
        staleTime: STALE_TIME.STANDARD,
        // Keep unused queries in cache for 5 minutes
        gcTime: CACHE_TIME.STANDARD,
        // Don't refetch on window focus by default (reduces unnecessary requests)
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect by default
        refetchOnReconnect: false,
        // Don't refetch on mount if data is still fresh
        refetchOnMount: false,
        // Structural sharing prevents unnecessary re-renders
        structuralSharing: true,
        // Network mode - use cache while offline
        networkMode: "offlineFirst",
      },
      mutations: {
        // Don't retry mutations by default
        retry: false,
        // Network mode for mutations
        networkMode: "online",
      },
    },
  });
}

/**
 * Query key factory for consistent key generation
 */
export const queryKeys = {
  // User-related queries
  user: {
    all: ["user"] as const,
    profile: (userId: string) => ["user", "profile", userId] as const,
    roles: (userId: string) => ["user", "roles", userId] as const,
    settings: (userId: string) => ["user", "settings", userId] as const,
  },
  // Application-related queries
  applications: {
    all: ["applications"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["applications", "list", filters] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
    drafts: (userId: string) => ["applications", "drafts", userId] as const,
  },
  // Student-related queries
  students: {
    all: ["students"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["students", "list", filters] as const,
    detail: (id: string) => ["students", "detail", id] as const,
    documents: (studentId: string) =>
      ["students", "documents", studentId] as const,
  },
  // University-related queries
  universities: {
    all: ["universities"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["universities", "list", filters] as const,
    detail: (id: string) => ["universities", "detail", id] as const,
    programs: (universityId: string) =>
      ["universities", "programs", universityId] as const,
    featured: ["universities", "featured"] as const,
  },
  // Messages and notifications
  messages: {
    all: ["messages"] as const,
    list: (conversationId?: string) =>
      ["messages", "list", conversationId] as const,
    unread: ["messages", "unread"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    unread: ["notifications", "unread"] as const,
  },
  // Analytics and stats
  analytics: {
    overview: (dateRange?: { from: Date; to: Date }) =>
      ["analytics", "overview", dateRange] as const,
    performance: (dateRange?: { from: Date; to: Date }) =>
      ["analytics", "performance", dateRange] as const,
  },
} as const;

/**
 * Prefetch strategies for common navigation patterns
 */
export const prefetchStrategies = {
  /** Prefetch on hover (for links) */
  onHover: { staleTime: STALE_TIME.SHORT },
  /** Prefetch on viewport intersection */
  onViewport: { staleTime: STALE_TIME.STANDARD },
  /** Prefetch eagerly (for likely next pages) */
  eager: { staleTime: STALE_TIME.LONG },
} as const;

export default createOptimizedQueryClient;
