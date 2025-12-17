"use client";

import { lazy, Suspense, ComponentType, useEffect, useState, memo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createOptimizedQueryClient } from "@/lib/queryConfig";

// UI & Providers
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { NavigationHistoryProvider } from "@/hooks/useNavigationHistory";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/performance/SkeletonLoaders";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { GlobalBackButton } from "@/components/GlobalBackButton";

// UI Elements
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// I18N
import { useTranslation } from "react-i18next";

/* ==========================================================================
   REACT QUERY
   ========================================================================== */

export const queryClient = createOptimizedQueryClient();

/* ==========================================================================
   CHUNK LOAD ERROR HANDLING
   ========================================================================== */

const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "ChunkLoadError",
  "Loading chunk",
  "Importing a module script failed",
] as const;

const CHUNK_RELOAD_SESSION_KEY = "__app_chunk_reload_ts";

const isChunkLoadError = (error: unknown): error is Error =>
  error instanceof Error &&
  CHUNK_ERROR_PATTERNS.some((p) => error.message.includes(p));

const triggerHardReload = async () => {
  const now = Date.now();
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) || "0");
  if (now - last < 5000) return;

  sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, String(now));

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  const url = new URL(window.location.href);
  url.searchParams.set("__cacheBust", String(now));
  window.location.replace(url.toString());
};

const LazyLoadErrorFallback = ({
  error,
  chunkError,
}: {
  error: unknown;
  chunkError: boolean;
}) => {
  const { t } = useTranslation();

  const message = chunkError
    ? t("app.errors.chunkReloadMessage")
    : error instanceof Error
    ? error.message
    : t("app.errors.failedToLoadPageDescription");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <h3 className="font-semibold text-lg">
              {t("app.errors.failedToLoadPageTitle")}
            </h3>
          </div>

          <p className="text-sm text-muted-foreground">{message}</p>

          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t("common.actions.reloadPage")}
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              {t("common.actions.goBack")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const lazyWithErrorHandling = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      const chunkError = isChunkLoadError(error);
      if (chunkError) void triggerHardReload();
      return {
        default: (() => (
          <LazyLoadErrorFallback error={error} chunkError={chunkError} />
        )) as unknown as T,
      };
    }
  });

/* ==========================================================================
   ROUTES (UNCHANGED, SAFE)
   ========================================================================== */

import Index from "./pages/Index";
import Login from "./pages/auth/Login";

const Dashboard = lazyWithErrorHandling(() => import("./pages/Dashboard"));
const Signup = lazyWithErrorHandling(() => import("./pages/auth/Signup"));
const NotFound = lazyWithErrorHandling(() => import("./pages/NotFound"));
const ZoeChatbot = lazyWithErrorHandling(() => import("@/components/ai/AIChatbot"));

/* ==========================================================================
   PREFETCH
   ========================================================================== */

const COMMON_IMPORTS = [
  () => import("./pages/auth/Signup"),
  () => import("./pages/CourseDiscovery"),
  () => import("./pages/Blog"),
];

const RoutePrefetcher = () => {
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() =>
        COMMON_IMPORTS.forEach((fn) => fn().catch(() => {}))
      );
    }
  }, []);
  return null;
};

/* ==========================================================================
   APP
   ========================================================================== */

const AppLoadingSkeleton = memo(() => (
  <div className="min-h-screen">
    <PageSkeleton />
  </div>
));

const App = memo(function App() {
  const [shouldRenderChatbot, setShouldRenderChatbot] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShouldRenderChatbot(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <AuthProvider>
              <NavigationHistoryProvider>
                <GlobalBackButton />
                <Suspense fallback={<AppLoadingSkeleton />}>
                  <Routes>
                    <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
                    <Route path="/auth/login" element={<PublicLayout><Login /></PublicLayout>} />
                    <Route path="/auth/signup" element={<PublicLayout><Signup /></PublicLayout>} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <RoutePrefetcher />
                  {shouldRenderChatbot && (
                    <Suspense fallback={null}>
                      <ZoeChatbot />
                    </Suspense>
                  )}
                </Suspense>
              </NavigationHistoryProvider>
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
        <PerformanceMonitor />
      </TooltipProvider>
    </QueryClientProvider>
  );
});

export default App;
