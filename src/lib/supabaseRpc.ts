type RpcErrorLike = {
  code?: string | null;
  message?: string | null;
};

const missingRpcCache = new Map<string, number>();

const isTestEnvironment =
  (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
  (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test");

const MISSING_RPC_TTL_MS = isTestEnvironment ? 0 : 5 * 60 * 1000;

const normalizeName = (name: string | null | undefined) =>
  (name ?? "").trim().toLowerCase();

/**
 * Detects when an RPC error indicates the function is missing or unavailable
 * in the current Supabase project (e.g., 404s from schema cache).
 */
export const isRpcMissingError = (error: RpcErrorLike | null | undefined) => {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "RPC_MISSING" ||
    error.code === "PGRST202" ||
    error.code === "PGRST204" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("could not find the function") ||
    message.includes("schema cache")
  );
};

/**
 * Marks an RPC as missing so subsequent calls can short-circuit and avoid noisy 404s.
 */
export const markRpcMissing = (
  rpcName: string,
  error?: RpcErrorLike | null,
) => {
  if (error && !isRpcMissingError(error)) return;
  const normalized = normalizeName(rpcName);
  if (!normalized) return;
  missingRpcCache.set(normalized, Date.now());
};

/**
 * Returns true if we previously detected that this RPC was missing.
 */
export const isRpcUnavailable = (rpcName: string) => {
  const normalized = normalizeName(rpcName);
  if (!normalized) return false;

  const lastSeen = missingRpcCache.get(normalized);
  if (!lastSeen) return false;

  if (MISSING_RPC_TTL_MS === 0) {
    missingRpcCache.delete(normalized);
    return false;
  }

  const isFresh = Date.now() - lastSeen < MISSING_RPC_TTL_MS;
  if (!isFresh) {
    missingRpcCache.delete(normalized);
    return false;
  }

  return true;
};

/**
 * Helper to construct a lightweight error for skipped RPC calls.
 */
export const buildMissingRpcError = (rpcName: string): RpcErrorLike => ({
  code: "RPC_MISSING",
  message: `${rpcName} is not available on this Supabase project`,
});
