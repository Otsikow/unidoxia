"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingState } from "@/components/LoadingState";
import { NavigationHistoryProvider } from "@/hooks/useNavigationHistory";
import { lazy, Suspense, ComponentType, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

/* ==========================================================================
   Chunk Error Handling
   ========================================================================== */

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

/* ==========================================================================
   React Query Setup
   ========================================================================== */

export const queryClient = new QueryClient({
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

/* ==========================================================================
   Lazy Imports — Public
   ========================================================================== */

// Keep the landing page eager so the initial paint has no suspense delay
import Index from "./pages/Index";
const OnboardingWelcome = lazyWithErrorHandling(() => import("./pages/onboarding/Welcome"));
const OnboardingVisaRequirements = lazyWithErrorHandling(() => import("./pages/onboarding/VisaRequirements"));
const OnboardingStudentSuccess = lazyWithErrorHandling(() => import("./pages/onboarding/StudentSuccess"));
const OnboardingDestinations = lazyWithErrorHandling(() => import("./pages/onboarding/Destinations"));
const OnboardingVisaSupport = lazyWithErrorHandling(() => import("./pages/onboarding/VisaSupport"));
const OnboardingAgentEarnings = lazyWithErrorHandling(() => import("./pages/onboarding/AgentEarnings"));

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

/* ==========================================================================
   Lazy Imports — Student
   ========================================================================== */

const StudentLayout = lazyWithErrorHandling(() => import("./components/layout/StudentLayout"));
const StudentOnboarding = lazyWithErrorHandling(() => import("./pages/student/StudentOnboarding"));
const StudentProfile = lazyWithErrorHandling(() => import("./pages/student/StudentProfile"));
const Documents = lazyWithErrorHandling(() => import("./pages/student/Documents"));
const Applications = lazyWithErrorHandling(() => import("./pages/student/Applications"));
const ApplicationTracking = lazyWithErrorHandling(() => import("./pages/student/ApplicationTracking"));
const NewApplication = lazyWithErrorHandling(() => import("./pages/student/NewApplication"));
const ApplicationDetails = lazyWithErrorHandling(() => import("./pages/student/ApplicationDetails"));
const StudentMessages = lazyWithErrorHandling(() => import("./pages/student/Messages"));
const VisaEligibility = lazyWithErrorHandling(() => import("./pages/student/VisaEligibility"));
const SopGenerator = lazyWithErrorHandling(() => import("./pages/student/SopGenerator"));
const Notifications = lazyWithErrorHandling(() => import("./pages/student/Notifications"));
const StudentPaymentsPage = lazyWithErrorHandling(() => import("./pages/student/StudentPayments"));
const Payments = lazyWithErrorHandling(() => import("./pages/Payments"));

/* ==========================================================================
   Lazy Imports — Admin
   ========================================================================== */

const AdminLayout = lazyWithErrorHandling(() => import("./components/layout/AdminLayout"));
const AdminDashboardPage = lazyWithErrorHandling(() => import("./pages/dashboards/AdminDashboard"));
const AdminOverview = lazyWithErrorHandling(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazyWithErrorHandling(() => import("./pages/admin/AdminUsers"));
const AdminAdmissions = lazyWithErrorHandling(() => import("./pages/admin/AdminAdmissions"));
const AdminAgentsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminAgents"));
const AdminPaymentsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminPayments"));
const AdminPartnersPage = lazyWithErrorHandling(() => import("./pages/admin/AdminPartners"));
const AdminResourcesPage = lazyWithErrorHandling(() => import("./pages/admin/AdminResources"));
const AdminProgramsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminPrograms"));
const AdminToolsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminTools"));
const AdminBroadcastCenterPage = lazyWithErrorHandling(() => import("./pages/admin/AdminBroadcastCenter"));
const AdminChatConsolePage = lazyWithErrorHandling(() => import("./pages/admin/AdminChatConsole"));
const AdminPerformanceReportsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminPerformanceReports"));
const AdminInsightsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminInsights"));
const ZoeIntelligencePage = lazyWithErrorHandling(() => import("./pages/admin/ZoeIntelligence"));
const AdminSettingsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminSettings"));
const AdminNotificationsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminNotifications"));
const AdminLogsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminLogs"));
const UserManagement = lazyWithErrorHandling(() => import("./pages/admin/UserManagement"));
const Analytics = lazyWithErrorHandling(() => import("./pages/admin/Analytics"));
const BlogAdminPage = lazyWithErrorHandling(() => import("./pages/admin/BlogAdmin"));
const AdminUsageMonitoringPage = lazyWithErrorHandling(() => import("./pages/admin/UsageMonitoring"));
const BuildPreviews = lazyWithErrorHandling(() => import("./pages/admin/BuildPreviews"));
const FeaturedUniversitiesAdmin = lazyWithErrorHandling(() => import("./pages/admin/FeaturedUniversitiesAdmin"));
const AdminUniversitiesPage = lazyWithErrorHandling(() => import("./pages/admin/AdminUniversities"));

/* ==========================================================================
   Lazy Imports — Staff & Agents
   ========================================================================== */

const StaffStudents = lazyWithErrorHandling(() => import("./pages/dashboard/StaffStudents"));
const StaffTasks = lazyWithErrorHandling(() => import("./pages/dashboard/StaffTasks"));
const StaffMessages = lazyWithErrorHandling(() => import("./pages/dashboard/StaffMessages"));
const StaffReports = lazyWithErrorHandling(() => import("./pages/dashboard/StaffReports"));
const StaffAIInsightsPage = lazyWithErrorHandling(() => import("./pages/dashboard/StaffAIInsights"));
const StaffSettingsRouter = lazyWithErrorHandling(() => import("./pages/dashboard/SettingsRouter"));
const ApplicationsRouter = lazyWithErrorHandling(() => import("./pages/dashboard/ApplicationsRouter"));
const AgentLeads = lazyWithErrorHandling(() => import("./pages/agent/MyLeads"));
const AgentRanking = lazyWithErrorHandling(() => import("./pages/agent/Ranking"));
const AgentImport = lazyWithErrorHandling(() => import("./pages/agent/Import"));
const AgentResources = lazyWithErrorHandling(() => import("./pages/agent/Resources"));
const AgentPartners = lazyWithErrorHandling(() => import("./pages/agent/Partners"));
const AgentPayments = lazyWithErrorHandling(() => import("./pages/agent/Payments"));
const AgentCommissions = lazyWithErrorHandling(() => import("./pages/agent/Commissions"));
const StaffBlogManagement = lazyWithErrorHandling(() => import("./pages/dashboard/StaffBlog"));
const PartnerDocumentRequests = lazyWithErrorHandling(() => import("./pages/dashboard/DocumentRequests"));
const OffersManagement = lazyWithErrorHandling(() => import("./pages/dashboard/OffersManagement"));
const ProfileSettings = lazyWithErrorHandling(() => import("./pages/ProfileSettings"));
const StudentDetailsPage = lazyWithErrorHandling(() => import("./pages/agent/StudentDetailsPage"));

/* ==========================================================================
   Lazy Imports — University
   ========================================================================== */

const UniversityDashboardShell = lazyWithErrorHandling(() => import("./pages/university/UniversityDashboard"));
const UniversityOverview = lazyWithErrorHandling(() => import("./pages/university/Overview"));
const UniversityApplications = lazyWithErrorHandling(() => import("./pages/university/Applications"));
const UniversityDocuments = lazyWithErrorHandling(() => import("./pages/university/Documents"));
const UniversityMessages = lazyWithErrorHandling(() => import("./pages/university/Messages"));
const UniversityOffersCAS = lazyWithErrorHandling(() => import("./pages/university/OffersCAS"));
const UniversityAnalytics = lazyWithErrorHandling(() => import("./pages/university/Analytics"));
const UniversityPrograms = lazyWithErrorHandling(() => import("./pages/university/Programs"));
const UniversityFeaturedShowcase = lazyWithErrorHandling(() => import("./pages/university/FeaturedShowcase"));
const UniversityProfileSettings = lazyWithErrorHandling(() => import("./pages/university/Profile"));

/* ==========================================================================
   AI Chatbot - Deferred loading for performance
   ========================================================================== */

const ZoeChatbot = lazyWithErrorHandling(() => import("./components/ai/AIChatbot"));

/* ==========================================================================
   Prefetching helpers
   ========================================================================== */

const PREFETCHED_IMPORTS = new Set<() => Promise<unknown>>();

const canPrefetch = () => {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  if (connection.effectiveType && ["slow-2g", "2g"].includes(connection.effectiveType)) return false;
  return true;
};

const schedulePrefetch = (imports: Array<() => Promise<unknown>>, timeout = 300) => {
  if (!canPrefetch()) return;

  const runPrefetch = () => {
    imports.forEach((importFn) => {
      if (PREFETCHED_IMPORTS.has(importFn)) return;
      PREFETCHED_IMPORTS.add(importFn);
      void importFn().catch((error) => {
        console.warn("Prefetch failed", error);
      });
    });
  };

  if ("requestIdleCallback" in window) {
    (window as typeof window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(runPrefetch);
  } else {
    setTimeout(runPrefetch, timeout);
  }
};

const COMMON_ROUTE_IMPORTS: Array<() => Promise<unknown>> = [
  () => import("./pages/auth/Login"),
  () => import("./pages/auth/Signup"),
  () => import("./pages/Dashboard"),
  () => import("./pages/CourseDiscovery"),
  () => import("./pages/Blog"),
];

const DASHBOARD_ROUTE_IMPORTS: Array<() => Promise<unknown>> = [
  () => import("./pages/dashboard/StaffStudents"),
  () => import("./pages/dashboard/StaffTasks"),
  () => import("./pages/dashboard/StaffMessages"),
  () => import("./pages/dashboard/ApplicationsRouter"),
];

const STUDENT_ROUTE_IMPORTS: Array<() => Promise<unknown>> = [
  () => import("./pages/student/StudentProfile"),
  () => import("./pages/student/Documents"),
  () => import("./pages/student/Applications"),
];

const ADMIN_ROUTE_IMPORTS: Array<() => Promise<unknown>> = [
  () => import("./pages/dashboards/AdminDashboard"),
  () => import("./pages/admin/AdminOverview"),
  () => import("./pages/admin/AdminUsers"),
];

const UNIVERSITY_ROUTE_IMPORTS: Array<() => Promise<unknown>> = [
  () => import("./pages/university/UniversityDashboard"),
  () => import("./pages/university/Overview"),
  () => import("./pages/university/Applications"),
];

/* ==========================================================================
   Route Preloading - Prefetch common routes on idle
   ========================================================================== */

// Preload commonly accessed routes after initial render
const preloadCommonRoutes = () => schedulePrefetch(COMMON_ROUTE_IMPORTS, 200);

/* ==========================================================================
   Redirect Helper
   ========================================================================== */

const LegacySignupRedirect = () => {
  const location = useLocation();
  const destination = `/auth/signup${location.search}${location.hash}`;
  return <Navigate to={destination} replace />;
};

const SearchRedirect = () => {
  const location = useLocation();
  // Preserve query parameters when redirecting from /search to /courses
  const destination = `/courses${location.search}${location.hash}`;
  return <Navigate to={destination} replace />;
};

/* ==========================================================================
   Route Prefetcher
   ========================================================================== */

const RoutePrefetcher = () => {
  const location = useLocation();

  useEffect(() => {
    schedulePrefetch(COMMON_ROUTE_IMPORTS, 100);
  }, []);

  useEffect(() => {
    const { pathname } = location;

    if (pathname.startsWith("/dashboard")) {
      schedulePrefetch(DASHBOARD_ROUTE_IMPORTS, 120);
    }

    if (pathname.startsWith("/student")) {
      schedulePrefetch(STUDENT_ROUTE_IMPORTS, 120);
    }

    if (pathname.startsWith("/admin")) {
      schedulePrefetch(ADMIN_ROUTE_IMPORTS, 120);
    }

    if (pathname.startsWith("/university")) {
      schedulePrefetch(UNIVERSITY_ROUTE_IMPORTS, 120);
    }
  }, [location.pathname]);

  return null;
};

/* ==========================================================================
   Main App Component
   ========================================================================== */

const App = () => {
  const { t } = useTranslation();
  const [shouldRenderChatbot, setShouldRenderChatbot] = useState(false);

  useEffect(() => {
    // Preload common routes on idle
    preloadCommonRoutes();

    // Defer chatbot loading until after page is interactive
    // This significantly improves Time to Interactive (TTI)
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const loadChatbot = () => {
      setShouldRenderChatbot(true);
    };

    // Wait for load event + delay, or just delay if already loaded
    if (document.readyState === "complete") {
      // Page already loaded, defer by 1.5s for smoother experience
      timeoutId = setTimeout(loadChatbot, 1500);
    } else {
      // Wait for page load, then defer
      const handleLoad = () => {
        timeoutId = setTimeout(loadChatbot, 1000);
      };
      window.addEventListener("load", handleLoad, { once: true });
      return () => {
        window.removeEventListener("load", handleLoad);
        clearTimeout(timeoutId);
      };
    }

    return () => clearTimeout(timeoutId);
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
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <LoadingState message={t("app.loading")} size="lg" />
                    </div>
                  }
                >
                  <div className="min-h-screen flex flex-col">
                    <div className="flex-1">
                      <Routes>

                        {/* ---------------- PUBLIC ROUTES ---------------- */}

                        <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
                        <Route path="/onboarding/welcome" element={<OnboardingWelcome />} />
                        <Route path="/onboarding/visa-requirements" element={<OnboardingVisaRequirements />} />
                        <Route path="/onboarding/success-stories" element={<OnboardingStudentSuccess />} />
                        <Route path="/onboarding/destinations" element={<OnboardingDestinations />} />
                        <Route path="/onboarding/visa-support" element={<OnboardingVisaSupport />} />
                        <Route path="/onboarding/agent-earnings" element={<OnboardingAgentEarnings />} />

                        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
                        <Route path="/faq" element={<PublicLayout><FAQ /></PublicLayout>} />
                        <Route path="/help" element={<PublicLayout><HelpCenter /></PublicLayout>} />
                        <Route path="/legal/privacy" element={<PublicLayout><LegalPrivacy /></PublicLayout>} />
                        <Route path="/legal/terms" element={<PublicLayout><LegalTerms /></PublicLayout>} />

                        <Route path="/auth/login" element={<PublicLayout><Login /></PublicLayout>} />
                        <Route path="/auth/signup" element={<PublicLayout><Signup /></PublicLayout>} />
                        <Route path="/signup" element={<LegacySignupRedirect />} />

                        <Route path="/verify-email" element={<PublicLayout><VerifyEmail /></PublicLayout>} />
                        <Route path="/auth/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />
                        <Route path="/auth/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />

                        <Route path="/search" element={<SearchRedirect />} />
                        <Route path="/courses" element={<PublicLayout><CourseDiscovery /></PublicLayout>} />

                        <Route path="/scholarships" element={<PublicLayout><Scholarships /></PublicLayout>} />
                        <Route path="/scholarships/share" element={<PublicLayout><ScholarshipShareLanding /></PublicLayout>} />

                        <Route path="/intake-form" element={<PublicLayout><IntakeForm /></PublicLayout>} />

                        <Route path="/blog" element={<PublicLayout><Blog /></PublicLayout>} />
                        <Route path="/blog/:slug" element={<PublicLayout><BlogPost /></PublicLayout>} />

                        <Route path="/universities" element={<PublicLayout><UniversityDirectory /></PublicLayout>} />
                        <Route path="/universities/:id" element={<PublicLayout><UniversityProfile /></PublicLayout>} />

                        <Route path="/partnership" element={<PublicLayout><UniversityPartnership /></PublicLayout>} />
                        <Route path="/visa-calculator" element={<PublicLayout><VisaCalculator /></PublicLayout>} />
                        <Route path="/feedback" element={<PublicLayout><Feedback /></PublicLayout>} />

                        {/* ---------------- PROTECTED ROUTES ---------------- */}

                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                        <Route path="/dashboard/offers" element={<ProtectedRoute allowedRoles={["staff","partner","admin"]}><OffersManagement /></ProtectedRoute>} />

                        <Route path="/dashboard/requests" element={<ProtectedRoute allowedRoles={["partner","admin","staff"]}><PartnerDocumentRequests /></ProtectedRoute>} />

                        <Route path="/dashboard/leads" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><AgentLeads /></ProtectedRoute>} />

                        <Route path="/dashboard/tasks" element={<ProtectedRoute allowedRoles={["agent","staff","admin"]}><StaffTasks /></ProtectedRoute>} />

                        <Route path="/dashboard/students" element={<ProtectedRoute allowedRoles={["agent","staff","admin"]}><StaffStudents /></ProtectedRoute>} />

                        <Route path="/dashboard/agents" element={<ProtectedRoute allowedRoles={["staff","admin"]}><AdminAgentsPage /></ProtectedRoute>} />

                        <Route path="/dashboard/reports" element={<ProtectedRoute allowedRoles={["staff","admin"]}><StaffReports /></ProtectedRoute>} />

                        <Route path="/dashboard/blog" element={<ProtectedRoute allowedRoles={["staff","admin"]}><StaffBlogManagement /></ProtectedRoute>} />

                        <Route path="/dashboard/applications" element={<ProtectedRoute allowedRoles={["staff","partner","admin","agent"]}><ApplicationsRouter /></ProtectedRoute>} />

                        <Route path="/dashboard/applications/new" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><NewApplication /></ProtectedRoute>} />

                        <Route path="/dashboard/messages" element={<ProtectedRoute allowedRoles={["agent","staff","admin"]}><StaffMessages /></ProtectedRoute>} />

                        <Route path="/dashboard/ranking" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><AgentRanking /></ProtectedRoute>} />

                        <Route path="/dashboard/payments" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><AgentPayments /></ProtectedRoute>} />

                        <Route path="/dashboard/commissions" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><AgentCommissions /></ProtectedRoute>} />

                        <Route path="/dashboard/import" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><AgentImport /></ProtectedRoute>} />

                        <Route path="/dashboard/resources" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><AgentResources /></ProtectedRoute>} />

                        <Route path="/dashboard/partners" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><AgentPartners /></ProtectedRoute>} />

                        <Route path="/dashboard/settings/*" element={<ProtectedRoute><StaffSettingsRouter /></ProtectedRoute>} />

                        <Route path="/dashboard/ai-insights" element={<ProtectedRoute allowedRoles={["staff","admin"]}><StaffAIInsightsPage /></ProtectedRoute>} />

                        {/* ---------------- STUDENT ROUTES ---------------- */}

                        <Route path="/student" element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
                          <Route index element={<Navigate to="/student/dashboard" replace />} />
                          <Route path="dashboard" element={<StudentProfile />} />
                          <Route path="onboarding" element={<StudentOnboarding />} />
                          <Route path="profile" element={<StudentProfile />} />
                          <Route path="documents" element={<Documents />} />
                          <Route path="applications" element={<Applications />} />
                          <Route path="applications/new" element={<NewApplication />} />
                          <Route path="applications/track/:id" element={<ApplicationTracking />} />
                          <Route path="applications/:id" element={<ApplicationDetails />} />
                          <Route path="messages" element={<StudentMessages />} />
                          <Route path="visa" element={<VisaEligibility />} />
                          <Route path="sop" element={<SopGenerator />} />
                          <Route path="notifications" element={<Notifications />} />
                          <Route path="payments" element={<StudentPaymentsPage />} />
                          <Route path="settings" element={<ProfileSettings />} />
                        </Route>

                        {/* ---------------- ADMIN ROUTES ---------------- */}

                        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin","staff"]}><AdminLayout /></ProtectedRoute>}>
                          <Route index element={<Navigate to="/admin/dashboard" replace />} />
                          <Route path="dashboard" element={<AdminDashboardPage />} />
                          <Route path="overview" element={<AdminOverview />} />
                          <Route path="users" element={<AdminUsers />} />
                          <Route path="admissions" element={<AdminAdmissions />} />
                          <Route path="agents" element={<AdminAgentsPage />} />
                          <Route path="payments" element={<AdminPaymentsPage />} />
                          <Route path="partners" element={<AdminPartnersPage />} />
                          <Route path="resources" element={<AdminResourcesPage />} />
                          <Route path="programs" element={<AdminProgramsPage />} />
                          <Route path="tools" element={<AdminToolsPage />} />
                          <Route path="broadcast" element={<AdminBroadcastCenterPage />} />
                          <Route path="chat" element={<AdminChatConsolePage />} />
                          <Route path="reports" element={<AdminPerformanceReportsPage />} />
                          <Route path="insights" element={<AdminInsightsPage />} />
                          <Route path="zoe" element={<ZoeIntelligencePage />} />
                          <Route path="settings" element={<AdminSettingsPage />} />
                          <Route path="notifications" element={<AdminNotificationsPage />} />
                          <Route path="logs" element={<AdminLogsPage />} />
                          <Route path="user-management" element={<UserManagement />} />
                          <Route path="analytics" element={<Analytics />} />
                          <Route path="blog" element={<BlogAdminPage />} />
                          <Route path="usage-monitoring" element={<AdminUsageMonitoringPage />} />
                          <Route path="usage" element={<Navigate to="/admin/usage-monitoring" replace />} />
                          <Route path="previews" element={<BuildPreviews />} />
                          <Route path="featured-universities" element={<FeaturedUniversitiesAdmin />} />
                          <Route path="universities" element={<AdminUniversitiesPage />} />
                        </Route>

                        {/* ---------------- UNIVERSITY PARTNER ROUTES ---------------- */}

                        <Route path="/university" element={<ProtectedRoute allowedRoles={["partner","admin"]}><UniversityDashboardShell /></ProtectedRoute>}>
                          <Route index element={<Navigate to="/university/overview" replace />} />
                          <Route path="overview" element={<UniversityOverview />} />
                          <Route path="applications" element={<UniversityApplications />} />
                          <Route path="documents" element={<UniversityDocuments />} />
                          <Route path="messages" element={<UniversityMessages />} />
                          <Route path="offers" element={<UniversityOffersCAS />} />
                          <Route path="analytics" element={<UniversityAnalytics />} />
                          <Route path="programs" element={<UniversityPrograms />} />
                          <Route path="featured" element={<UniversityFeaturedShowcase />} />
                          <Route path="profile" element={<UniversityProfileSettings />} />
                        </Route>

                        {/* ---------------- AGENT STUDENT DETAILS ---------------- */}

                        <Route path="/agent/students/:studentId" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><StudentDetailsPage /></ProtectedRoute>} />

                        {/* ---------------- PROFILE SETTINGS (All authenticated users) ---------------- */}

                        <Route path="/profile/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                        <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

                        {/* ---------------- PAYMENTS ---------------- */}

                        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />

                        {/* ---------------- CATCH-ALL ---------------- */}

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      <RoutePrefetcher />
                    </div>
                    {shouldRenderChatbot && <ZoeChatbot />}
                  </div>
                </Suspense>
              </NavigationHistoryProvider>
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
