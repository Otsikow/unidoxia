import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "./useAuth";

export type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_PRIORITY: AppRole[] = [
  "admin",
  "staff",
  "partner",
  "agent",
  "counselor",
  "verifier",
  "finance",
  "school_rep",
  "student",
];

interface UseUserRolesResult {
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  error: PostgrestError | Error | null;
  refresh: () => Promise<void>;
  hasRole: (role: AppRole | AppRole[]) => boolean;
}

const USER_ROLES_TIMEOUT_MS = 12000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms while loading user roles`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const useUserRoles = (): UseUserRolesResult => {
  const { user, profile } = useAuth();
  const userId = user?.id ?? null;

  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<PostgrestError | Error | null>(null);

  const normalizeRole = useCallback(
    (value: unknown): AppRole | null => {
      if (typeof value !== "string") {
        return null;
      }

      const normalized = value.trim().toLowerCase();
      
      if (normalized === "university") {
        return "partner";
      }
      
      return ROLE_PRIORITY.includes(normalized as AppRole) ? (normalized as AppRole) : null;
    },
    []
  );

  const mapRoles = useCallback((data: { role: AppRole }[] | null) => {
    if (!data) return [] as AppRole[];
    return data.map((item) => item.role);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchRoles = async () => {
      if (!userId) {
        if (isActive) {
          setRoles([]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      if (isActive) {
        setLoading(true);
      }

      try {
        const query = supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        const result = await withTimeout(
          Promise.resolve(query),
          USER_ROLES_TIMEOUT_MS
        );

        if (!isActive) return;

        if (result.error) {
          console.error("Error fetching user roles:", result.error);
          setError(result.error);
          setRoles([]);
        } else {
          setError(null);
          setRoles(mapRoles(result.data));
        }
      } catch (err) {
        if (!isActive) return;

        const resolvedError = err instanceof Error ? err : new Error("Failed to load user roles");
        console.error("Unexpected error fetching user roles:", resolvedError);
        setError(resolvedError);
        setRoles([]);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchRoles();

    return () => {
      isActive = false;
    };
  }, [mapRoles, userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRoles([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const query = supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      const result = await withTimeout(
        Promise.resolve(query),
        USER_ROLES_TIMEOUT_MS
      );

      if (result.error) {
        console.error("Error refreshing user roles:", result.error);
        setError(result.error);
        setRoles([]);
      } else {
        setError(null);
        setRoles(mapRoles(result.data));
      }
    } catch (err) {
      const resolvedError = err instanceof Error ? err : new Error("Failed to refresh user roles");
      console.error("Unexpected error refreshing user roles:", resolvedError);
      setError(resolvedError);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [mapRoles, userId]);

  const metadataRole = normalizeRole(user?.user_metadata?.role);
  const profileRole = normalizeRole(profile?.role);

  const effectiveRoles = useMemo(() => {
    const uniqueRoles = new Set<AppRole>(roles);

    if (profileRole) {
      uniqueRoles.add(profileRole);
    }

    if (metadataRole) {
      uniqueRoles.add(metadataRole);
    }

    const prioritized = Array.from(uniqueRoles).sort((a, b) => {
      const indexA = ROLE_PRIORITY.indexOf(a);
      const indexB = ROLE_PRIORITY.indexOf(b);
      return (indexA === -1 ? ROLE_PRIORITY.length : indexA) - (indexB === -1 ? ROLE_PRIORITY.length : indexB);
    });

    return prioritized;
  }, [metadataRole, profileRole, roles]);

  const hasRole = useCallback(
    (requiredRoles: AppRole | AppRole[]) => {
      const roleList = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      return roleList.some((role) => effectiveRoles.includes(role));
    },
    [effectiveRoles]
  );

  const primaryRole = useMemo(() => {
    for (const candidate of ROLE_PRIORITY) {
      if (effectiveRoles.includes(candidate)) {
        return candidate;
      }
    }
    return null;
  }, [effectiveRoles]);

  return {
    roles: effectiveRoles,
    primaryRole,
    loading,
    error,
    refresh,
    hasRole,
  };
};
