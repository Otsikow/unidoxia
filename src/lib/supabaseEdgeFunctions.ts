import { getSupabaseBrowserConfig } from "@/lib/supabaseClientConfig";

type HeadersRecord = Record<string, string>;

const SUPABASE_CONFIG = getSupabaseBrowserConfig();
const FUNCTIONS_BASE_URL = (() => {
  const base =
    SUPABASE_CONFIG.functionsUrl ?? `${SUPABASE_CONFIG.url}/functions/v1`;
  return base.replace(/\/+$/, "");
})();

export interface FunctionsResponse<T = unknown> {
  data: T | null;
  error: Error | null;
}

export interface EdgeFunctionInvokeOptions {
  headers?: HeadersRecord;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string | null;
  includeAnonKey?: boolean;
}

export const invokeEdgeFunction = async <T = unknown>(
  functionName: string,
  options: EdgeFunctionInvokeOptions = {},
): Promise<FunctionsResponse<T>> => {
  const { accessToken, includeAnonKey = false, headers, method, body } = options;

  const finalHeaders: HeadersRecord = {
    apikey: SUPABASE_CONFIG.anonKey,
    ...(headers ?? {}),
  };

  const shouldAttachAnonToken = includeAnonKey || !finalHeaders.Authorization;
  const tokenToUse =
    accessToken ??
    (shouldAttachAnonToken ? SUPABASE_CONFIG.anonKey : undefined);

  if (tokenToUse && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${tokenToUse}`;
  }

  let requestBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (
      typeof body === "string" ||
      body instanceof Blob ||
      body instanceof FormData ||
      body instanceof ArrayBuffer ||
      body instanceof URLSearchParams
    ) {
      requestBody = body as BodyInit;
    } else {
      requestBody = JSON.stringify(body);
      if (!finalHeaders["Content-Type"] && !finalHeaders["content-type"]) {
        finalHeaders["Content-Type"] = "application/json";
      }
    }
  }

  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
      method: method ?? (requestBody !== undefined ? "POST" : "POST"),
      headers: finalHeaders,
      body: requestBody,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text();

    if (!response.ok) {
      const message =
        (payload && typeof payload === "object" && "error" in payload
          ? String((payload as Record<string, unknown>).error)
          : typeof payload === "string" && payload
            ? payload
            : `Edge function ${functionName} failed with status ${response.status}`) ||
        `Edge function ${functionName} failed`;
      return { data: null, error: new Error(message) };
    }

    return { data: payload as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};
