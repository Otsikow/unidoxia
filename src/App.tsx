"use client";

import { lazy, Suspense, ComponentType, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// UI & Global Providers
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { NavigationHistoryProvider } from "@/hooks/useNavigationHistory";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingState } from "@/components/LoadingState";

// UI Elements
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// I18N
import { useTranslation } from "react-i18next";

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

const isChunkLoadError = (error: unknown): error is Error => {
  if (!(error instanceof Error)) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => error.message.includes(pattern));
};

const triggerHardReload = async () => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const lastReload = Number(window.sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) || "0");

  if (now - lastReload < 5000) return;

  window.sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, String(now));

  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
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
      console.error("Lazy load error:", error);
      if (chunkError) void triggerHardReload();

      return {
        default: (() => (
          <LazyLoadErrorFallback error={error} chunkError={chunkError} />
        )) as unknown as T,
      };
    }
  });

/* ==========================================================================
   REACT QUERY CONFIG
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
   LAZY IMPORTS — PUBLIC
   ========================================================================== */

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
// Auth login is imported eagerly to avoid chunk loading issues that prevent
// the sign-in form from rendering when users click the call-to-action.
import Login from "./pages/auth/Login";

const OnboardingWelcome = lazyWithErrorHandling(() =>
  import("./pages/onboarding/Welcome")
);
const OnboardingVisaRequirements = lazyWithErrorHandling(() =>
  import("./pages/onboarding/VisaRequirements")
);
const OnboardingStudentSuccess = lazyWithErrorHandling(() =>
  import("./pages/onboarding/StudentSuccess")
);
const OnboardingDestinations = lazyWithErrorHandling(() =>
  import("./pages/onboarding/Destinations")
);
const OnboardingVisaSupport = lazyWithErrorHandling(() =>
  import("./pages/onboarding/VisaSupport")
);

// AGENT ONBOARDING ROUTES (OPTION C)
const AgentOnboardingWelcome = lazyWithErrorHandling(() =>
  import("./pages/agent/AgentOnboardingWelcome")
);
const OnboardingAgentEarnings = lazyWithErrorHandling(() =>
  import("./pages/onboarding/AgentEarnings")
);

const Contact = lazyWithErrorHandling(() => import("./pages/Contact"));
const FAQ = lazyWithErrorHandling(() => import("./pages/FAQ"));
const HelpCenter = lazyWithErrorHandling(() => import("./pages/HelpCenter"));
const LegalPrivacy = lazyWithErrorHandling(() => import("./pages/LegalPrivacy"));
const LegalTerms = lazyWithErrorHandling(() => import("./pages/LegalTerms"));
const Feedback = lazyWithErrorHandling(() => import("./pages/Feedback"));
const Signup = lazyWithErrorHandling(() => import("./pages/auth/Signup"));
const VerifyEmail = lazyWithErrorHandling(() => import("./pages/auth/VerifyEmail"));
const ForgotPassword = lazyWithErrorHandling(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazyWithErrorHandling(() => import("./pages/auth/ResetPassword"));
const UniversitySearch = lazyWithErrorHandling(() => import("./pages/UniversitySearch"));
const CourseDiscovery = lazyWithErrorHandling(() => import("./pages/CourseDiscovery"));
const UniversityPartnership = lazyWithErrorHandling(() =>
  import("./pages/UniversityPartnership")
);
const UniversityDirectory = lazyWithErrorHandling(() =>
  import("./pages/UniversityDirectory")
);
const UniversityProfile = lazyWithErrorHandling(() =>
  import("./pages/UniversityProfile")
);
const IntakeForm = lazyWithErrorHandling(() => import("./pages/IntakeForm"));
const VisaCalculator = lazyWithErrorHandling(() => import("./pages/VisaCalculator"));
const Scholarships = lazyWithErrorHandling(() => import("./pages/Scholarships"));
const ScholarshipShareLanding = lazyWithErrorHandling(() =>
  import("./pages/ScholarshipShareLanding")
);
const Blog = lazyWithErrorHandling(() => import("./pages/Blog"));
const BlogPost = lazyWithErrorHandling(() => import("./pages/BlogPost"));
const NotFound = lazyWithErrorHandling(() => import("./pages/NotFound"));

/* ==========================================================================
   LAZY IMPORTS — STUDENT
   ========================================================================== */

const StudentLayout = lazyWithErrorHandling(() =>
  import("./components/layout/StudentLayout")
);
const StudentProfile = lazyWithErrorHandling(() =>
  import("./pages/student/StudentProfile")
);
const StudentOnboarding = lazyWithErrorHandling(() =>
  import("./pages/student/StudentOnboarding")
);
const Documents = lazyWithErrorHandling(() => import("./pages/student/Documents"));
const Applications = lazyWithErrorHandling(() =>
  import("./pages/student/Applications")
);
const NewApplication = lazyWithErrorHandling(() =>
  import("./pages/student/NewApplication")
);
const ApplicationTracking = lazyWithErrorHandling(() =>
  import("./pages/student/ApplicationTracking")
);
const ApplicationDetails = lazyWithErrorHandling(() =>
  import("./pages/student/ApplicationDetails")
);
const StudentMessages = lazyWithErrorHandling(() =>
  import("./pages/student/Messages")
);
const VisaEligibility = lazyWithErrorHandling(() =>
  import("./pages/student/VisaEligibility")
);
const SopGenerator = lazyWithErrorHandling(() =>
  import("./pages/student/SopGenerator")
);
const Notifications = lazyWithErrorHandling(() =>
  import("./pages/student/Notifications")
);
const StudentPaymentsPage = lazyWithErrorHandling(() =>
  import("./pages/student/StudentPayments")
);

/* ==========================================================================
   LAZY IMPORTS — ADMIN
   ========================================================================== */

const AdminLayout = lazyWithErrorHandling(() =>
  import("./components/layout/AdminLayout")
);
const AdminDashboardPage = lazyWithErrorHandling(() =>
  import("./pages/dashboards/AdminDashboard")
);
const AdminOverview = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminOverview")
);
const AdminUsers = lazyWithErrorHandling(() => import("./pages/admin/AdminUsers"));
const AdminAdmissions = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminAdmissions")
);
const AdminAgentsPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminAgents")
);
const AdminPaymentsPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminPayments")
);
const AdminPartnersPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminPartners")
);
const AdminResourcesPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminResources")
);
const AdminProgramsPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminPrograms")
);
const AdminToolsPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminTools")
);
const AdminBroadcastCenterPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminBroadcastCenter")
);
const AdminChatConsolePage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminChatConsole")
);
const AdminPerformanceReportsPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminPerformanceReports")
);
const AdminInsightsPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminInsights")
);
const ZoeIntelligencePage = lazyWithErrorHandling(() =>
  import("./pages/admin/ZoeIntelligence")
);
const AdminSettingsPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminSettings")
);
const AdminNotificationsPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminNotifications")
);
const AdminLogsPage = lazyWithErrorHandling(() => import("./pages/admin/AdminLogs"));
const UserManagement = lazyWithErrorHandling(() =>
  import("./pages/admin/UserManagement")
);
const Analytics = lazyWithErrorHandling(() => import("./pages/admin/Analytics"));
const BlogAdminPage = lazyWithErrorHandling(() =>
  import("./pages/admin/BlogAdmin")
);
const AdminUsageMonitoringPage = lazyWithErrorHandling(() =>
  import("./pages/admin/UsageMonitoring")
);
const BuildPreviews = lazyWithErrorHandling(() =>
  import("./pages/admin/BuildPreviews")
);
const FeaturedUniversitiesAdmin = lazyWithErrorHandling(() =>
  import("./pages/admin/FeaturedUniversitiesAdmin")
);
const AdminUniversitiesPage = lazyWithErrorHandling(() =>
  import("./pages/admin/AdminUniversities")
);

/* ==========================================================================
   LAZY IMPORTS — AGENTS & STAFF
   ========================================================================== */

const AgentLeads = lazyWithErrorHandling(() => import("./pages/agent/MyLeads"));
const AgentRanking = lazyWithErrorHandling(() => import("./pages/agent/Ranking"));
const AgentImport = lazyWithErrorHandling(() => import("./pages/agent/Import"));
const AgentResources = lazyWithErrorHandling(() =>
  import("./pages/agent/Resources")
);
const AgentPartners = lazyWithErrorHandling(() => import("./pages/agent/Partners"));
const AgentPayments = lazyWithErrorHandling(() =>
  import("./pages/agent/Payments")
);
const AgentCommissions = lazyWithErrorHandling(() =>
  import("./pages/agent/Commissions")
);
const StudentDetailsPage = lazyWithErrorHandling(() =>
  import("./pages/agent/StudentDetailsPage")
);

const StaffStudents = lazyWithErrorHandling(() =>
  import("./pages/dashboard/StaffStudents")
);
const StaffTasks = lazyWithErrorHandling(() => import("./pages/dashboard/StaffTasks"));
const StaffMessages = lazyWithErrorHandling(() =>
  import("./pages/dashboard/StaffMessages")
);
const StaffReports = lazyWithErrorHandling(() =>
  import("./pages/dashboard/StaffReports")
);
const StaffAIInsightsPage = lazyWithErrorHandling(() =>
  import("./pages/dashboard/StaffAIInsights")
);

const StaffSettingsRouter = lazyWithErrorHandling(() =>
  import("./pages/dashboard/SettingsRouter")
);
const ApplicationsRouter = lazyWithErrorHandling(() =>
  import("./pages/dashboard/ApplicationsRouter")
);

const StaffBlogManagement = lazyWithErrorHandling(() =>
  import("./pages/dashboard/StaffBlog")
);
const PartnerDocumentRequests = lazyWithErrorHandling(() =>
  import("./pages/dashboard/DocumentRequests")
);
const OffersManagement = lazyWithErrorHandling(() =>
  import("./pages/dashboard/OffersManagement")
);

/* ==========================================================================
   LAZY IMPORTS — UNIVERSITY
   ========================================================================== */

const UniversityDashboardShell = lazyWithErrorHandling(() =>
  import("./pages/university/UniversityDashboard")
);
const UniversityOverview = lazyWithErrorHandling(() =>
  import("./pages/university/Overview")
);
const UniversityApplications = lazyWithErrorHandling(() =>
  import("./pages/university/Applications")
);
const UniversityDocuments = lazyWithErrorHandling(() =>
  import("./pages/university/Documents")
);
const UniversityMessages = lazyWithErrorHandling(() =>
  import("./pages/university/Messages")
);
const UniversityOffersCAS = lazyWithErrorHandling(() =>
  import("./pages/university/OffersCAS")
);
const UniversityAnalytics = lazyWithErrorHandling(() =>
  import("./pages/university/Analytics")
);
const UniversityPrograms = lazyWithErrorHandling(() =>
  import("./pages/university/Programs")
);
const UniversityFeaturedShowcase = lazyWithErrorHandling(() =>
  import("./pages/university/FeaturedShowcase")
);
const UniversityProfileSettings = lazyWithErrorHandling(() =>
  import("./pages/university/Profile")
);

/* ==========================================================================
   AI Chatbot — Deferred
   ========================================================================== */

const ZoeChatbot = lazyWithErrorHandling(() =>
  import("./components/ai/AIChatbot")
);

/* ==========================================================================
   PREFETCH HELPERS
   ========================================================================== */

const PREFETCHED = new Set<() => Promise<unknown>>();

const canPrefetch = () => {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  if (["slow-2g", "2g"].includes(conn.effectiveType)) return false;
  return true;
};

const schedulePrefetch = (imports: Array<() => Promise<unknown>>, timeout = 300) => {
  if (!canPrefetch()) return;

  const run = () => {
    imports.forEach((fn) => {
      if (PREFETCHED.has(fn)) return;
      PREFETCHED.add(fn);
      void fn().catch(() => {});
    });
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run);
  } else setTimeout(run, timeout);
};

const COMMON_IMPORTS = [
  () => import("./pages/auth/Signup"),
  () => import("./pages/CourseDiscovery"),
  () => import("./pages/Blog"),
];

const preloadCommonRoutes = () => schedulePrefetch(COMMON_IMPORTS, 200);

/* ==========================================================================
   REDIRECT HELPERS
   ========================================================================== */

const LegacySignupRedirect = () => {
  const loc = useLocation();
  return <Navigate to={`/auth/signup${loc.search}${loc.hash}`} replace />;
};

const SearchRedirect = () => {
  const loc = useLocation();
  return <Navigate to={`/courses${loc.search}${loc.hash}`} replace />;
};

/* ==========================================================================
   PREFETCHER ON ROUTE CHANGE
   ========================================================================== */

const RoutePrefetcher = () => {
  const location = useLocation();

  useEffect(() => {
    schedulePrefetch(COMMON_IMPORTS, 100);
  }, []);

  return null;
};

/* ==========================================================================
   MAIN APP
   ========================================================================== */

const App = () => {
  const { t } = useTranslation();
  const [shouldRenderChatbot, setShouldRenderChatbot] = useState(false);

  useEffect(() => {
    preloadCommonRoutes();

    let timeoutId: any;

    const loadChatbot = () => setShouldRenderChatbot(true);

    if (document.readyState === "complete") {
      timeoutId = setTimeout(loadChatbot, 1500);
    } else {
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

                        {/* ============================================================
                           PUBLIC ROUTES
                           ============================================================ */}

                        <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />

                        {/* Onboarding */}
                        <Route path="/onboarding/welcome" element={<OnboardingWelcome />} />
                        <Route path="/onboarding/visa-requirements" element={<OnboardingVisaRequirements />} />
                        <Route path="/onboarding/success-stories" element={<OnboardingStudentSuccess />} />
                        <Route path="/onboarding/destinations" element={<OnboardingDestinations />} />
                        <Route path="/onboarding/visa-support" element={<OnboardingVisaSupport />} />

                        {/* AGENT ONBOARDING (PUBLIC — OPTION C) */}
                        <Route
                          path="/agents/onboarding"
                          element={<PublicLayout><AgentOnboardingWelcome /></PublicLayout>}
                        />
                        <Route
                          path="/agents/earnings"
                          element={<PublicLayout><OnboardingAgentEarnings /></PublicLayout>}
                        />

                        {/* Auth */}
                        <Route path="/auth/login" element={<PublicLayout><Login /></PublicLayout>} />
                        <Route path="/auth/signup" element={<PublicLayout><Signup /></PublicLayout>} />
                        <Route path="/signup" element={<LegacySignupRedirect />} />
                        <Route path="/verify-email" element={<PublicLayout><VerifyEmail /></PublicLayout>} />
                        <Route path="/auth/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />
                        <Route path="/auth/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />

                        {/* Public Screens */}
                        <Route path="/search" element={<SearchRedirect />} />
                        <Route path="/courses" element={<PublicLayout><CourseDiscovery /></PublicLayout>} />
                        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
                        <Route path="/faq" element={<PublicLayout><FAQ /></PublicLayout>} />
                        <Route path="/help" element={<PublicLayout><HelpCenter /></PublicLayout>} />
                        <Route path="/legal/privacy" element={<PublicLayout><LegalPrivacy /></PublicLayout>} />
                        <Route path="/legal/terms" element={<PublicLayout><LegalTerms /></PublicLayout>} />
                        <Route path="/intake-form" element={<PublicLayout><IntakeForm /></PublicLayout>} />
                        <Route path="/feedback" element={<PublicLayout><Feedback /></PublicLayout>} />

                        {/* University Search */}
                        <Route path="/universities" element={<PublicLayout><UniversityDirectory /></PublicLayout>} />
                        <Route path="/universities/:id" element={<PublicLayout><UniversityProfile /></PublicLayout>} />

                        {/* Blog */}
                        <Route path="/blog" element={<PublicLayout><Blog /></PublicLayout>} />
                        <Route path="/blog/:slug" element={<PublicLayout><BlogPost /></PublicLayout>} />

                        {/* Scholarships */}
                        <Route path="/scholarships" element={<PublicLayout><Scholarships /></PublicLayout>} />
                        <Route path="/scholarships/share" element={<PublicLayout><ScholarshipShareLanding /></PublicLayout>} />

                        {/* Visa Calculator */}
                        <Route path="/visa-calculator" element={<PublicLayout><VisaCalculator /></PublicLayout>} />

                        <Route path="/partnership" element={<PublicLayout><UniversityPartnership /></PublicLayout>} />

                        {/* ============================================================
                           PROTECTED ROUTES
                           ============================================================ */}

                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />

                        {/* Staff / Agent / Partner Shared */}
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

                        {/* STUDENT ROUTES */}
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
                          <Route path="settings" element={<UniversityProfileSettings />} />
                        </Route>

                        {/* ADMIN ROUTES */}
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
                          <Route path="tools/broadcast-center" element={<AdminBroadcastCenterPage />} />
                          <Route path="chat" element={<AdminChatConsolePage />} />
                          <Route path="tools/chat-console" element={<AdminChatConsolePage />} />
                          <Route path="reports" element={<AdminPerformanceReportsPage />} />
                          <Route path="tools/performance-reports" element={<AdminPerformanceReportsPage />} />
                          <Route path="insights" element={<AdminInsightsPage />} />
                          <Route path="intelligence" element={<ZoeIntelligencePage />} />
                          <Route path="zoe" element={<Navigate to="/admin/intelligence" replace />} />
                          <Route path="settings" element={<AdminSettingsPage />} />
                          <Route path="notifications" element={<AdminNotificationsPage />} />
                          <Route path="logs" element={<AdminLogsPage />} />
                          <Route path="user-management" element={<UserManagement />} />
                          <Route path="analytics" element={<Analytics />} />
                          <Route path="blog" element={<BlogAdminPage />} />
                          <Route path="usage-monitoring" element={<AdminUsageMonitoringPage />} />
                          <Route path="previews" element={<BuildPreviews />} />
                          <Route path="featured-universities" element={<FeaturedUniversitiesAdmin />} />
                          <Route path="universities" element={<AdminUniversitiesPage />} />
                        </Route>

                        {/* UNIVERSITY PARTNER ROUTES */}
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

                        {/* Agent Student Details */}
                        <Route path="/agent/students/:studentId" element={<ProtectedRoute allowedRoles={["agent","admin","staff"]}><StudentDetailsPage /></ProtectedRoute>} />

                        {/* General Settings */}
                        <Route path="/profile/settings" element={<ProtectedRoute><UniversityProfileSettings /></ProtectedRoute>} />

                        {/* Payments */}
                        <Route path="/payments" element={<ProtectedRoute><StudentPaymentsPage /></ProtectedRoute>} />

                        {/* Catch-All */}
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
