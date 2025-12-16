/**
 * Supabase query optimization utilities
 * Helps reduce over-fetching and improves query performance
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Select only specific fields to reduce payload size
 */
export const selectFields = <T extends string[]>(...fields: T) => {
  return fields.join(",");
};

/**
 * Common field selections for frequently used tables
 */
export const commonSelects = {
  profile: selectFields(
    "id",
    "tenant_id",
    "role",
    "full_name",
    "email",
    "phone",
    "country",
    "avatar_url",
    "onboarded"
  ),
  
  application: selectFields(
    "id",
    "student_id",
    "university_id",
    "program_id",
    "status",
    "created_at",
    "updated_at"
  ),
  
  university: selectFields(
    "id",
    "name",
    "country",
    "logo_url",
    "verified",
    "featured"
  ),
  
  program: selectFields(
    "id",
    "university_id",
    "name",
    "level",
    "duration",
    "tuition_fee",
    "currency"
  ),
};

/**
 * Batch multiple queries efficiently
 */
export const batchQueries = async <T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> => {
  return Promise.all(queries.map((query) => query()));
};

/**
 * Create a reusable query builder with common filters
 */
export const createQueryBuilder = <T>(
  supabase: SupabaseClient,
  table: string
) => {
  return {
    select: (fields?: string) => {
      return supabase.from(table).select(fields || "*");
    },
    
    selectOne: (fields?: string) => {
      return supabase.from(table).select(fields || "*").single();
    },
    
    selectPaginated: (
      fields?: string,
      page = 0,
      pageSize = 10
    ) => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      return supabase
        .from(table)
        .select(fields || "*", { count: "exact" })
        .range(from, to);
    },
    
    selectWithCount: (fields?: string) => {
      return supabase.from(table).select(fields || "*", { count: "exact" });
    },
  };
};

/**
 * Optimize query with proper indexing hints
 */
export const optimizeQuery = <T>(
  query: any,
  options?: {
    limit?: number;
    orderBy?: string;
    orderDirection?: "asc" | "desc";
    filters?: Record<string, any>;
  }
) => {
  let optimizedQuery = query;

  // Apply filters
  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        optimizedQuery = optimizedQuery.eq(key, value);
      }
    });
  }

  // Apply ordering
  if (options?.orderBy) {
    optimizedQuery = optimizedQuery.order(
      options.orderBy,
      { ascending: options.orderDirection === "asc" }
    );
  }

  // Apply limit
  if (options?.limit) {
    optimizedQuery = optimizedQuery.limit(options.limit);
  }

  return optimizedQuery;
};

/**
 * Cache key generator for consistent caching
 */
export const generateCacheKey = (
  table: string,
  operation: string,
  params?: Record<string, any>
) => {
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .reduce((acc, key) => ({ ...acc, [key]: params[key] }), {})
    : {};
  
  return [table, operation, sortedParams];
};

/**
 * Optimized count query (faster than fetching all data)
 */
export const getCount = async (
  supabase: SupabaseClient,
  table: string,
  filters?: Record<string, any>
) => {
  let query = supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { count, error } = await query;
  
  if (error) throw error;
  return count || 0;
};

/**
 * Debounced search query
 */
export const createSearchQuery = (
  supabase: SupabaseClient,
  table: string,
  searchField: string,
  searchTerm: string,
  options?: {
    limit?: number;
    additionalFields?: string;
  }
) => {
  return supabase
    .from(table)
    .select(options?.additionalFields || "*")
    .ilike(searchField, `%${searchTerm}%`)
    .limit(options?.limit || 10);
};

/**
 * Batch upsert for better performance
 */
export const batchUpsert = async <T>(
  supabase: SupabaseClient,
  table: string,
  data: T[],
  chunkSize = 100
) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase.from(table).upsert(chunk).select()
    )
  );

  return results.flatMap((r) => r.data || []);
};

/**
 * Get related data efficiently with a single query
 */
export const getWithRelations = async (
  supabase: SupabaseClient,
  table: string,
  id: string,
  relations: string[]
) => {
  const selectClause = ["*", ...relations.map((r) => `${r}(*)`)].join(",");
  
  return supabase
    .from(table)
    .select(selectClause)
    .eq("id", id)
    .single();
};
