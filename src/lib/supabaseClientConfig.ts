const SUPABASE_MANAGED_SUFFIXES = [
  ".supabase.co",
  ".supabase.in",
  ".supabase.net",
  ".supabase.red",
];

const DEFAULT_SITE_URL = "http://localhost:5173";
const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "public-anon-key";

interface SupabaseBrowserConfig {
  url: string;
  anonKey: string;
  functionsUrl: string;
  isFallback: boolean;
}

let cachedBrowserConfig: SupabaseBrowserConfig | null = null;

const safeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOrigin = (input: string): string => {
  const candidate = input.trim();
  if (!candidate) {
    throw new Error(
      "[supabase] Received an empty URL while normalizing configuration",
    );
  }

  const hasProtocol = /^https?:\/\//i.test(candidate);
  const parsed = new URL(hasProtocol ? candidate : `https://${candidate}`);
  return parsed.origin;
};

const normalizeAbsoluteUrl = (input: string): string => {
  const candidate = input.trim();
  if (!candidate) {
    throw new Error(
      "[supabase] Received an empty URL while normalizing configuration",
    );
  }

  const hasProtocol = /^https?:\/\//i.test(candidate);
  const parsed = new URL(hasProtocol ? candidate : `https://${candidate}`);
  return parsed.href.replace(/\/+$/, "");
};

const ensureFunctionsPath = (baseUrl: string): string => {
  const sanitized = baseUrl.replace(/\/+$/, "");
  const hasFunctionsPath = /\/functions(?:\/v\d+)?$/i.test(sanitized);
  return hasFunctionsPath ? sanitized : `${sanitized}/functions/v1`;
};

const isSupabaseManagedHost = (host: string): boolean => {
  const lowerHost = host.toLowerCase();

  if (lowerHost === "localhost" || lowerHost === "127.0.0.1") {
    return true;
  }

  return SUPABASE_MANAGED_SUFFIXES.some((suffix) => lowerHost.endsWith(suffix));
};

const deriveProjectDomain = (projectId: string): string => {
  const sanitized = projectId.trim();
  if (!sanitized) {
    throw new Error("[supabase] VITE_SUPABASE_PROJECT_ID is defined but empty");
  }
  return `https://${sanitized}.supabase.co`;
};

const deriveFunctionsDomainFromProjectId = (projectId: string): string => {
  const sanitized = projectId.trim();
  if (!sanitized) {
    throw new Error("[supabase] VITE_SUPABASE_PROJECT_ID is defined but empty");
  }
  return `https://${sanitized}.functions.supabase.co`;
};

const deriveFunctionsDomainFromHost = (
  hostname: string,
): string | undefined => {
  const lowerHost = hostname.toLowerCase();

  if (lowerHost === "localhost" || lowerHost === "127.0.0.1") {
    return undefined;
  }

  if (!SUPABASE_MANAGED_SUFFIXES.some((suffix) => lowerHost.endsWith(suffix))) {
    return undefined;
  }

  const parts = lowerHost.split(".");
  if (parts.length < 3) {
    return undefined;
  }

  const [projectRef, ...rest] = parts;
  const domain = rest.join(".");
  return `https://${projectRef}.functions.${domain}`;
};

export const resolveSupabaseApiUrl = (): string => {
  const customDomain = safeString(import.meta.env?.VITE_SUPABASE_CUSTOM_DOMAIN);
  if (customDomain) {
    return toOrigin(customDomain);
  }

  const configuredUrl = safeString(import.meta.env?.VITE_SUPABASE_URL);
  const projectId = safeString(import.meta.env?.VITE_SUPABASE_PROJECT_ID);

  if (configuredUrl) {
    try {
      const origin = toOrigin(configuredUrl);
      const hostname = new URL(origin).hostname;

      if (isSupabaseManagedHost(hostname)) {
        return origin;
      }

      if (!projectId) {
        console.warn(
          `[supabase] VITE_SUPABASE_URL "${configuredUrl}" does not look like a Supabase-managed host and no project id fallback is available. Using it as-is.`,
        );
        return origin;
      }

      const fallback = deriveProjectDomain(projectId);
      console.warn(
        `[supabase] VITE_SUPABASE_URL "${configuredUrl}" does not look like the Supabase API host. Falling back to "${fallback}". Set VITE_SUPABASE_CUSTOM_DOMAIN if you are using a custom proxy.`,
      );
      return fallback;
    } catch (error) {
      if (!projectId) {
        throw new Error(
          `[supabase] Invalid VITE_SUPABASE_URL "${configuredUrl}". Provide a valid URL or set VITE_SUPABASE_PROJECT_ID.`,
        );
      }

      const fallback = deriveProjectDomain(projectId);
      console.warn(
        `[supabase] Invalid VITE_SUPABASE_URL "${configuredUrl}". Falling back to "${fallback}". Set VITE_SUPABASE_CUSTOM_DOMAIN if you are using a custom proxy.`,
      );
      return fallback;
    }
  }

  if (projectId) {
    return deriveProjectDomain(projectId);
  }

  throw new Error(
    "[supabase] Missing Supabase configuration. Define VITE_SUPABASE_URL, VITE_SUPABASE_CUSTOM_DOMAIN, or VITE_SUPABASE_PROJECT_ID.",
  );
};

export const getSupabaseAnonKey = (): string => {
  const anonKey = safeString(import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!anonKey) {
    throw new Error("[supabase] Missing VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  return anonKey;
};

export const resolveSupabaseFunctionsUrl = (): string => {
  const configuredFunctionsUrl = safeString(
    import.meta.env?.VITE_SUPABASE_FUNCTIONS_URL,
  );
  if (configuredFunctionsUrl) {
    try {
      return ensureFunctionsPath(normalizeAbsoluteUrl(configuredFunctionsUrl));
    } catch (error) {
      console.warn(
        `[supabase] VITE_SUPABASE_FUNCTIONS_URL "${configuredFunctionsUrl}" is invalid. Ignoring custom functions URL.`,
      );
    }
  }

  const apiUrl = resolveSupabaseApiUrl();
  const apiOrigin = toOrigin(apiUrl);
  const hostname = new URL(apiOrigin).hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return ensureFunctionsPath(normalizeAbsoluteUrl(`${apiOrigin}/functions/v1`));
  }

  const managedDomain = deriveFunctionsDomainFromHost(hostname);
  if (managedDomain) {
    return ensureFunctionsPath(normalizeAbsoluteUrl(managedDomain));
  }

  const projectId = safeString(import.meta.env?.VITE_SUPABASE_PROJECT_ID);
  if (projectId) {
    try {
      return ensureFunctionsPath(
        normalizeAbsoluteUrl(deriveFunctionsDomainFromProjectId(projectId)),
      );
    } catch (error) {
      console.warn(
        "[supabase] Unable to derive functions domain from project id. Falling back to API URL.",
      );
    }
  }

  return ensureFunctionsPath(normalizeAbsoluteUrl(`${apiOrigin}/functions/v1`));
};

export const getSiteUrl = (): string => {
  const configured = safeString(import.meta.env?.VITE_PUBLIC_SITE_URL);
  if (configured) {
    try {
      return toOrigin(configured);
    } catch (error) {
      console.warn(
        `[supabase] VITE_PUBLIC_SITE_URL "${configured}" is invalid. Falling back to runtime origin or default development URL.`,
      );
    }
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_SITE_URL;
};

export const buildEmailRedirectUrl = (path: string): string | undefined => {
  const baseSiteUrl = safeString(import.meta.env?.VITE_PUBLIC_SITE_URL);

  if (!baseSiteUrl) {
    console.warn(
      '[supabase] VITE_PUBLIC_SITE_URL is not configured. Falling back to Supabase project redirect URL for auth emails.',
    );
    return undefined;
  }

  try {
    const origin = toOrigin(baseSiteUrl);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${normalizedPath}`;
  } catch (error) {
    console.warn(
      `[supabase] VITE_PUBLIC_SITE_URL "${baseSiteUrl}" is invalid. Falling back to Supabase project redirect URL for auth emails.`,
      error,
    );
    return undefined;
  }
};

export const getSupabaseBrowserConfig = (): SupabaseBrowserConfig => {
  if (cachedBrowserConfig) {
    return cachedBrowserConfig;
  }

  try {
    cachedBrowserConfig = {
      url: resolveSupabaseApiUrl(),
      anonKey: getSupabaseAnonKey(),
      functionsUrl: resolveSupabaseFunctionsUrl(),
      isFallback: false,
    };
    return cachedBrowserConfig;
  } catch (error) {
    console.error(
      "[supabase] Failed to resolve configuration. Messaging features will operate in degraded mode.",
      error,
    );

    cachedBrowserConfig = {
      url: FALLBACK_SUPABASE_URL,
      anonKey: FALLBACK_SUPABASE_ANON_KEY,
      functionsUrl: `${FALLBACK_SUPABASE_URL}/functions/v1`,
      isFallback: true,
    };

    return cachedBrowserConfig;
  }
};

export const isSupabaseConfigFallback = () => getSupabaseBrowserConfig().isFallback;
