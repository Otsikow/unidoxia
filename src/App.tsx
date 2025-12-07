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
const OnboardingScholarshipDiscovery = lazyWithErrorHandling(() => import("./pages/onboarding/ScholarshipDiscovery"));
const OnboardingFastApplications = lazyWithErrorHandling(() => import("./pages/onboarding/FastApplications"));
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
const ProfileSettings = lazyWithErrorHandling(() => import("./pages/ProfileSettings"));
const Payments = lazyWithErrorHandling(() => import("./pages/Payments"));

/* -------------------------------------------------------------------------- */
/* Lazy Imports — Student                                                     */
/* -------------------------------------------------------------------------- */

const StudentDashboard = lazyWithErrorHandling(() => import("./pages/dashboards/StudentDashboard"));
const StudentOnboarding = lazyWithErrorHandling(() => import("./pages/student/StudentOnboarding"));
const StudentApplications = lazyWithErrorHandling(() => import("./pages/student/Applications"));
const StudentNewApplication = lazyWithErrorHandling(() => import("./pages/student/NewApplication"));
const StudentApplicationDetails = lazyWithErrorHandling(() => import("./pages/student/ApplicationDetails"));
const StudentApplicationTracking = lazyWithErrorHandling(() => import("./pages/student/ApplicationTracking"));
const StudentDocuments = lazyWithErrorHandling(() => import("./pages/student/Documents"));
const StudentMessages = lazyWithErrorHandling(() => import("./pages/student/Messages"));
const StudentNotifications = lazyWithErrorHandling(() => import("./pages/student/Notifications"));
const StudentProfile = lazyWithErrorHandling(() => import("./pages/student/StudentProfile"));
const StudentPayments = lazyWithErrorHandling(() => import("./pages/student/StudentPayments"));
const StudentVisaEligibility = lazyWithErrorHandling(() => import("./pages/student/VisaEligibility"));
const StudentSopGenerator = lazyWithErrorHandling(() => import("./pages/student/SopGenerator"));

/* -------------------------------------------------------------------------- */
/* Lazy Imports — Agent                                                       */
/* -------------------------------------------------------------------------- */

const AgentDashboard = lazyWithErrorHandling(() => import("./pages/dashboards/AgentDashboard"));
const AgentStudents = lazyWithErrorHandling(() => import("./pages/agent/Students"));
const AgentStudentDetails = lazyWithErrorHandling(() => import("./pages/agent/StudentDetailsPage"));
const AgentMyLeads = lazyWithErrorHandling(() => import("./pages/agent/MyLeads"));
const AgentImport = lazyWithErrorHandling(() => import("./pages/agent/Import"));
const AgentResources = lazyWithErrorHandling(() => import("./pages/agent/Resources"));
const AgentRanking = lazyWithErrorHandling(() => import("./pages/agent/Ranking"));
const AgentCommissions = lazyWithErrorHandling(() => import("./pages/agent/Commissions"));
const AgentPayments = lazyWithErrorHandling(() => import("./pages/agent/Payments"));
const AgentPartners = lazyWithErrorHandling(() => import("./pages/agent/Partners"));
const AgentSettings = lazyWithErrorHandling(() => import("./pages/agent/Settings"));
const AgentTasks = lazyWithErrorHandling(() => import("./pages/agent/Tasks"));

/* -------------------------------------------------------------------------- */
/* Lazy Imports — Staff/Admin                                                 */
/* -------------------------------------------------------------------------- */

const StaffDashboard = lazyWithErrorHandling(() => import("./pages/dashboards/StaffDashboard"));
const AdminDashboard = lazyWithErrorHandling(() => import("./pages/dashboards/AdminDashboard"));
const AdminOverview = lazyWithErrorHandling(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazyWithErrorHandling(() => import("./pages/admin/AdminUsers"));
const AdminAgents = lazyWithErrorHandling(() => import("./pages/admin/AdminAgents"));
const AdminPartners = lazyWithErrorHandling(() => import("./pages/admin/AdminPartners"));
const AdminUniversities = lazyWithErrorHandling(() => import("./pages/admin/AdminUniversities"));
const AdminPrograms = lazyWithErrorHandling(() => import("./pages/admin/AdminPrograms"));
const AdminAdmissions = lazyWithErrorHandling(() => import("./pages/admin/AdminAdmissions"));
const AdminPayments = lazyWithErrorHandling(() => import("./pages/admin/AdminPayments"));
const AdminInsights = lazyWithErrorHandling(() => import("./pages/admin/AdminInsights"));
const AdminSettings = lazyWithErrorHandling(() => import("./pages/admin/AdminSettings"));
const AdminResources = lazyWithErrorHandling(() => import("./pages/admin/AdminResources"));
const AdminLogs = lazyWithErrorHandling(() => import("./pages/admin/AdminLogs"));
const AdminNotifications = lazyWithErrorHandling(() => import("./pages/admin/AdminNotifications"));
const AdminBroadcastCenter = lazyWithErrorHandling(() => import("./pages/admin/AdminBroadcastCenter"));
const AdminChatConsole = lazyWithErrorHandling(() => import("./pages/admin/AdminChatConsole"));
const AdminTools = lazyWithErrorHandling(() => import("./pages/admin/AdminTools"));
const AdminPerformanceReports = lazyWithErrorHandling(() => import("./pages/admin/AdminPerformanceReports"));
const Analytics = lazyWithErrorHandling(() => import("./pages/admin/Analytics"));
const BlogAdmin = lazyWithErrorHandling(() => import("./pages/admin/BlogAdmin"));
const FeaturedUniversitiesAdmin = lazyWithErrorHandling(() => import("./pages/admin/FeaturedUniversitiesAdmin"));
const FeedbackAnalytics = lazyWithErrorHandling(() => import("./pages/admin/FeedbackAnalytics"));
const UsageMonitoring = lazyWithErrorHandling(() => import("./pages/admin/UsageMonitoring"));
const UserManagement = lazyWithErrorHandling(() => import("./pages/admin/UserManagement"));
const ZoeIntelligence = lazyWithErrorHandling(() => import("./pages/admin/ZoeIntelligence"));
const BuildPreviews = lazyWithErrorHandling(() => import("./pages/admin/BuildPreviews"));

/* -------------------------------------------------------------------------- */
/* Lazy Imports — Staff Dashboard Pages                                       */
/* -------------------------------------------------------------------------- */

const StaffApplications = lazyWithErrorHandling(() => import("./pages/dashboard/StaffApplications"));
const StaffStudents = lazyWithErrorHandling(() => import("./pages/dashboard/StaffStudents"));
const StaffMessages = lazyWithErrorHandling(() => import("./pages/dashboard/StaffMessages"));
const StaffReports = lazyWithErrorHandling(() => import("./pages/dashboard/StaffReports"));
const StaffSettings = lazyWithErrorHandling(() => import("./pages/dashboard/StaffSettings"));
const StaffTasks = lazyWithErrorHandling(() => import("./pages/dashboard/StaffTasks"));
const StaffAIInsights = lazyWithErrorHandling(() => import("./pages/dashboard/StaffAIInsights"));
const StaffBlog = lazyWithErrorHandling(() => import("./pages/dashboard/StaffBlog"));
const DocumentRequests = lazyWithErrorHandling(() => import("./pages/dashboard/DocumentRequests"));
const OffersManagement = lazyWithErrorHandling(() => import("./pages/dashboard/OffersManagement"));
const ApplicationsRouter = lazyWithErrorHandling(() => import("./pages/dashboard/ApplicationsRouter"));
const StudentsRouter = lazyWithErrorHandling(() => import("./pages/dashboard/StudentsRouter"));
const SettingsRouter = lazyWithErrorHandling(() => import("./pages/dashboard/SettingsRouter"));
const TasksRouter = lazyWithErrorHandling(() => import("./pages/dashboard/TasksRouter"));

/* -------------------------------------------------------------------------- */
/* Lazy Imports — University/Partner                                          */
/* -------------------------------------------------------------------------- */

const UniversityDashboard = lazyWithErrorHandling(() => import("./pages/dashboards/UniversityDashboard"));
const UniversityOverview = lazyWithErrorHandling(() => import("./pages/university/Overview"));
const UniversityApplications = lazyWithErrorHandling(() => import("./pages/university/Applications"));
const UniversityPrograms = lazyWithErrorHandling(() => import("./pages/university/Programs"));
const UniversityDocuments = lazyWithErrorHandling(() => import("./pages/university/Documents"));
const UniversityDocumentRequests = lazyWithErrorHandling(() => import("./pages/university/DocumentRequests"));
const UniversityMessages = lazyWithErrorHandling(() => import("./pages/university/Messages"));
const UniversityOffersCAS = lazyWithErrorHandling(() => import("./pages/university/OffersCAS"));
const UniversityAnalytics = lazyWithErrorHandling(() => import("./pages/university/Analytics"));
const UniversityFeaturedShowcase = lazyWithErrorHandling(() => import("./pages/university/FeaturedShowcase"));
const UniversityProfilePage = lazyWithErrorHandling(() => import("./pages/university/Profile"));

const PartnerDashboard = lazyWithErrorHandling(() => import("./pages/dashboards/PartnerDashboard"));
const PartnerOverview = lazyWithErrorHandling(() => import("./pages/partner/dashboard/Overview"));
const PartnerApplications = lazyWithErrorHandling(() => import("./pages/partner/Applications"));
const PartnerDocumentRequests = lazyWithErrorHandling(() => import("./pages/partner/DocumentRequests"));
const PartnerMessages = lazyWithErrorHandling(() => import("./pages/partner/Messages"));
const PartnerOffersCAS = lazyWithErrorHandling(() => import("./pages/partner/OffersCAS"));

/* -------------------------------------------------------------------------- */
/* Loading Fallback                                                           */
/* -------------------------------------------------------------------------- */

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingState message="Loading..." size="lg" />
  </div>
);

/* -------------------------------------------------------------------------- */
/* Auth-aware Route Wrapper                                                   */
/* -------------------------------------------------------------------------- */

const AuthAwareLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  return <>{children}</>;
};

/* -------------------------------------------------------------------------- */
/* App Component                                                              */
/* -------------------------------------------------------------------------- */

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <NavigationHistoryProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
                    <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
                    <Route path="/faq" element={<PublicLayout><FAQ /></PublicLayout>} />
                    <Route path="/help" element={<PublicLayout><HelpCenter /></PublicLayout>} />
                    <Route path="/privacy" element={<PublicLayout><LegalPrivacy /></PublicLayout>} />
                    <Route path="/terms" element={<PublicLayout><LegalTerms /></PublicLayout>} />
                    <Route path="/feedback" element={<PublicLayout><Feedback /></PublicLayout>} />
                    <Route path="/universities" element={<PublicLayout><UniversityDirectory /></PublicLayout>} />
                    <Route path="/universities/:id" element={<PublicLayout><UniversityProfile /></PublicLayout>} />
                    <Route path="/university-search" element={<PublicLayout><UniversitySearch /></PublicLayout>} />
                    <Route path="/courses" element={<PublicLayout><CourseDiscovery /></PublicLayout>} />
                    <Route path="/partnership" element={<PublicLayout><UniversityPartnership /></PublicLayout>} />
                    <Route path="/intake-form" element={<PublicLayout><IntakeForm /></PublicLayout>} />
                    <Route path="/visa-calculator" element={<PublicLayout><VisaCalculator /></PublicLayout>} />
                    <Route path="/scholarships" element={<PublicLayout><Scholarships /></PublicLayout>} />
                    <Route path="/scholarship/:id" element={<PublicLayout><ScholarshipShareLanding /></PublicLayout>} />
                    <Route path="/blog" element={<PublicLayout><Blog /></PublicLayout>} />
                    <Route path="/blog/:slug" element={<PublicLayout><BlogPost /></PublicLayout>} />

                    {/* Onboarding routes */}
                    <Route path="/onboarding" element={<PublicLayout><OnboardingWelcome /></PublicLayout>} />
                    <Route path="/onboarding/welcome" element={<PublicLayout><OnboardingWelcome /></PublicLayout>} />
                    <Route path="/onboarding/destinations" element={<PublicLayout><OnboardingDestinations /></PublicLayout>} />
                    <Route path="/onboarding/document-checker" element={<PublicLayout><OnboardingDocumentChecker /></PublicLayout>} />
                    <Route path="/onboarding/program-matching" element={<PublicLayout><OnboardingProgramMatching /></PublicLayout>} />
                    <Route path="/onboarding/scholarships" element={<PublicLayout><OnboardingScholarshipDiscovery /></PublicLayout>} />
                    <Route path="/onboarding/fast-applications" element={<PublicLayout><OnboardingFastApplications /></PublicLayout>} />

                    {/* Auth routes */}
                    <Route path="/auth/login" element={<Login />} />
                    <Route path="/auth/signup" element={<Signup />} />
                    <Route path="/auth/verify-email" element={<VerifyEmail />} />
                    <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                    <Route path="/auth/reset-password" element={<ResetPassword />} />

                    {/* Dashboard routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/dashboard/applications" element={<ProtectedRoute><ApplicationsRouter /></ProtectedRoute>} />
                    <Route path="/dashboard/students" element={<ProtectedRoute><StudentsRouter /></ProtectedRoute>} />
                    <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsRouter /></ProtectedRoute>} />
                    <Route path="/dashboard/tasks" element={<ProtectedRoute><TasksRouter /></ProtectedRoute>} />
                    <Route path="/dashboard/documents" element={<ProtectedRoute><DocumentRequests /></ProtectedRoute>} />
                    <Route path="/dashboard/offers" element={<ProtectedRoute><OffersManagement /></ProtectedRoute>} />
                    <Route path="/dashboard/messages" element={<ProtectedRoute><StaffMessages /></ProtectedRoute>} />
                    <Route path="/dashboard/reports" element={<ProtectedRoute><StaffReports /></ProtectedRoute>} />
                    <Route path="/dashboard/ai-insights" element={<ProtectedRoute><StaffAIInsights /></ProtectedRoute>} />
                    <Route path="/dashboard/blog" element={<ProtectedRoute><StaffBlog /></ProtectedRoute>} />

                    {/* Profile & Settings */}
                    <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                    <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />

                    {/* Student routes */}
                    <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
                    <Route path="/student/onboarding" element={<ProtectedRoute><StudentOnboarding /></ProtectedRoute>} />
                    <Route path="/student/applications" element={<ProtectedRoute><StudentApplications /></ProtectedRoute>} />
                    <Route path="/student/applications/new" element={<ProtectedRoute><StudentNewApplication /></ProtectedRoute>} />
                    <Route path="/student/applications/:id" element={<ProtectedRoute><StudentApplicationDetails /></ProtectedRoute>} />
                    <Route path="/student/application-tracking" element={<ProtectedRoute><StudentApplicationTracking /></ProtectedRoute>} />
                    <Route path="/student/documents" element={<ProtectedRoute><StudentDocuments /></ProtectedRoute>} />
                    <Route path="/student/messages" element={<ProtectedRoute><StudentMessages /></ProtectedRoute>} />
                    <Route path="/student/notifications" element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />
                    <Route path="/student/profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
                    <Route path="/student/payments" element={<ProtectedRoute><StudentPayments /></ProtectedRoute>} />
                    <Route path="/student/visa-eligibility" element={<ProtectedRoute><StudentVisaEligibility /></ProtectedRoute>} />
                    <Route path="/student/sop-generator" element={<ProtectedRoute><StudentSopGenerator /></ProtectedRoute>} />

                    {/* Agent routes */}
                    <Route path="/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
                    <Route path="/agent/students" element={<ProtectedRoute><AgentStudents /></ProtectedRoute>} />
                    <Route path="/agent/students/:id" element={<ProtectedRoute><AgentStudentDetails /></ProtectedRoute>} />
                    <Route path="/agent/leads" element={<ProtectedRoute><AgentMyLeads /></ProtectedRoute>} />
                    <Route path="/agent/import" element={<ProtectedRoute><AgentImport /></ProtectedRoute>} />
                    <Route path="/agent/resources" element={<ProtectedRoute><AgentResources /></ProtectedRoute>} />
                    <Route path="/agent/ranking" element={<ProtectedRoute><AgentRanking /></ProtectedRoute>} />
                    <Route path="/agent/commissions" element={<ProtectedRoute><AgentCommissions /></ProtectedRoute>} />
                    <Route path="/agent/payments" element={<ProtectedRoute><AgentPayments /></ProtectedRoute>} />
                    <Route path="/agent/partners" element={<ProtectedRoute><AgentPartners /></ProtectedRoute>} />
                    <Route path="/agent/settings" element={<ProtectedRoute><AgentSettings /></ProtectedRoute>} />
                    <Route path="/agent/tasks" element={<ProtectedRoute><AgentTasks /></ProtectedRoute>} />

                    {/* Admin routes */}
                    <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/overview" element={<ProtectedRoute><AdminOverview /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                    <Route path="/admin/agents" element={<ProtectedRoute><AdminAgents /></ProtectedRoute>} />
                    <Route path="/admin/partners" element={<ProtectedRoute><AdminPartners /></ProtectedRoute>} />
                    <Route path="/admin/universities" element={<ProtectedRoute><AdminUniversities /></ProtectedRoute>} />
                    <Route path="/admin/programs" element={<ProtectedRoute><AdminPrograms /></ProtectedRoute>} />
                    <Route path="/admin/admissions" element={<ProtectedRoute><AdminAdmissions /></ProtectedRoute>} />
                    <Route path="/admin/payments" element={<ProtectedRoute><AdminPayments /></ProtectedRoute>} />
                    <Route path="/admin/insights" element={<ProtectedRoute><AdminInsights /></ProtectedRoute>} />
                    <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
                    <Route path="/admin/resources" element={<ProtectedRoute><AdminResources /></ProtectedRoute>} />
                    <Route path="/admin/logs" element={<ProtectedRoute><AdminLogs /></ProtectedRoute>} />
                    <Route path="/admin/notifications" element={<ProtectedRoute><AdminNotifications /></ProtectedRoute>} />
                    <Route path="/admin/broadcast" element={<ProtectedRoute><AdminBroadcastCenter /></ProtectedRoute>} />
                    <Route path="/admin/chat-console" element={<ProtectedRoute><AdminChatConsole /></ProtectedRoute>} />
                    <Route path="/admin/tools" element={<ProtectedRoute><AdminTools /></ProtectedRoute>} />
                    <Route path="/admin/performance" element={<ProtectedRoute><AdminPerformanceReports /></ProtectedRoute>} />
                    <Route path="/admin/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                    <Route path="/admin/blog" element={<ProtectedRoute><BlogAdmin /></ProtectedRoute>} />
                    <Route path="/admin/featured-universities" element={<ProtectedRoute><FeaturedUniversitiesAdmin /></ProtectedRoute>} />
                    <Route path="/admin/feedback" element={<ProtectedRoute><FeedbackAnalytics /></ProtectedRoute>} />
                    <Route path="/admin/usage" element={<ProtectedRoute><UsageMonitoring /></ProtectedRoute>} />
                    <Route path="/admin/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                    <Route path="/admin/zoe" element={<ProtectedRoute><ZoeIntelligence /></ProtectedRoute>} />
                    <Route path="/admin/previews" element={<ProtectedRoute><BuildPreviews /></ProtectedRoute>} />

                    {/* University/Partner routes */}
                    <Route path="/university" element={<ProtectedRoute><UniversityOverview /></ProtectedRoute>} />
                    <Route path="/university/overview" element={<ProtectedRoute><UniversityOverview /></ProtectedRoute>} />
                    <Route path="/university/applications" element={<ProtectedRoute><UniversityApplications /></ProtectedRoute>} />
                    <Route path="/university/programs" element={<ProtectedRoute><UniversityPrograms /></ProtectedRoute>} />
                    <Route path="/university/documents" element={<ProtectedRoute><UniversityDocuments /></ProtectedRoute>} />
                    <Route path="/university/document-requests" element={<ProtectedRoute><UniversityDocumentRequests /></ProtectedRoute>} />
                    <Route path="/university/messages" element={<ProtectedRoute><UniversityMessages /></ProtectedRoute>} />
                    <Route path="/university/offers-cas" element={<ProtectedRoute><UniversityOffersCAS /></ProtectedRoute>} />
                    <Route path="/university/analytics" element={<ProtectedRoute><UniversityAnalytics /></ProtectedRoute>} />
                    <Route path="/university/featured" element={<ProtectedRoute><UniversityFeaturedShowcase /></ProtectedRoute>} />
                    <Route path="/university/profile" element={<ProtectedRoute><UniversityProfilePage /></ProtectedRoute>} />

                    <Route path="/partner" element={<ProtectedRoute><PartnerOverview /></ProtectedRoute>} />
                    <Route path="/partner/overview" element={<ProtectedRoute><PartnerOverview /></ProtectedRoute>} />
                    <Route path="/partner/applications" element={<ProtectedRoute><PartnerApplications /></ProtectedRoute>} />
                    <Route path="/partner/documents" element={<ProtectedRoute><PartnerDocumentRequests /></ProtectedRoute>} />
                    <Route path="/partner/messages" element={<ProtectedRoute><PartnerMessages /></ProtectedRoute>} />
                    <Route path="/partner/offers" element={<ProtectedRoute><PartnerOffersCAS /></ProtectedRoute>} />

                    {/* 404 */}
                    <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
                  </Routes>
                </Suspense>
                <Toaster />
                <Sonner />
              </NavigationHistoryProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
