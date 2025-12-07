"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingState } from "@/components/LoadingState";
import { NavigationHistoryProvider } from "@/hooks/useNavigationHistory";
import { lazy, Suspense, ComponentType, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

/* -------------------------------------------------------------------------- */
/* Chunk Error Handling & Recovery Logic                                      */
/* -------------------------------------------------------------------------- */

const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "ChunkLoadError",
  "Loading chunk",
  "Importing a module script failed",
] as const;

const CHUNK_RELOAD_SESSION_KEY = "__app_chunk_reload_ts";

const isChunkLoadError = (error: unknown): error is Error => {
  if (!(error instanceof Error)) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => error.message.includes(pattern));
};

const triggerHardReload = async () => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const lastReloadTs = Number(window.sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) ?? "0");

  if (now - lastReloadTs < 5000) return;

  window.sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, String(now));

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  const url = new URL(window.location.href);
  url.searchParams.set("__cacheBust", now.toString());
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
    : error instanceof Error && error.message
    ? error.message
    : t("app.errors.failedToLoadPageDescription");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <h3 className="font-semibold text-lg">{t("app.errors.failedToLoadPageTitle")}</h3>
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
      console.error("Error loading component:", error);

      if (chunkError) void triggerHardReload();

      return {
        default: (() => (
          <LazyLoadErrorFallback error={error} chunkError={chunkError} />
        )) as unknown as T,
      };
    }
  });

/* -------------------------------------------------------------------------- */
/* React Query Setup                                                          */
/* -------------------------------------------------------------------------- */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (attempt, error) => {
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return attempt < 3;
      },
      retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

/* -------------------------------------------------------------------------- */
/* Lazy Imports — Public                                                      */
/* -------------------------------------------------------------------------- */

const Index = lazyWithErrorHandling(() => import("./pages/Index"));
const OnboardingWelcome = lazyWithErrorHandling(() => import("./pages/onboarding/Welcome"));
const OnboardingDestinations = lazyWithErrorHandling(() => import("./pages/onboarding/Destinations"));
const OnboardingDocumentChecker = lazyWithErrorHandling(() => import("./pages/onboarding/DocumentChecker"));
const OnboardingProgramMatching = lazyWithErrorHandling(() => import("./pages/onboarding/ProgramMatching"));
const Contact = lazyWithErrorHandling(() => import("./pages/Contact"));
const FAQ = lazyWithErrorHandling(() => import("./pages/FAQ"));
const HelpCenter = lazyWithErrorHandling(() => import("./pages/HelpCenter"));
const LegalPrivacy = lazyWithErrorHandling(() => import("./pages/LegalPrivacy"));
const LegalTerms = lazyWithErrorHandling(() => import("./pages/LegalTerms"));
const Feedback = lazyWithErrorHandling(() => import("./pages/Feedback"));
const Login = lazyWithErrorHandling(() => import("./pages/auth/Login"));
const Signup = lazyWithErrorHandling(() => import("./pages/auth/Signup"));
const VerifyEmail = lazyWithErrorHandling(() => import("./pages/auth/VerifyEmail"));
const ForgotPassword = lazyWithErrorHandling(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazyWithErrorHandling(() => import("./pages/auth/ResetPassword"));
const Dashboard = lazyWithErrorHandling(() => import("./pages/Dashboard"));
const UniversitySearch = lazyWithErrorHandling(() => import("./pages/UniversitySearch"));
const CourseDiscovery = lazyWithErrorHandling(() => import("./pages/CourseDiscovery"));
const UniversityPartnership = lazyWithErrorHandling(() => import("./pages/UniversityPartnership"));
const UniversityDirectory = lazyWithErrorHandling(() => import("./pages/UniversityDirectory"));
const UniversityProfile = lazyWithErrorHandling(() => import("./pages/UniversityProfile"));
const IntakeForm = lazyWithErrorHandling(() => import("./pages/IntakeForm"));
const VisaCalculator = lazyWithErrorHandling(() => import("./pages/VisaCalculator"));
const Scholarships = lazyWithErrorHandling(() => import("./pages/Scholarships"));
const ScholarshipShareLanding = lazyWithErrorHandling(() => import("./pages/ScholarshipShareLanding"));
const Blog = lazyWithErrorHandling(() => import("./pages/Blog"));
const BlogPost = lazyWithErrorHandling(() => import("./pages/BlogPost"));
const NotFound = lazyWithErrorHandling(() => import("./pages/NotFound"));
