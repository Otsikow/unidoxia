
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStudent } from "@/hooks/useStudent";
import { Link, useParams } from "react-router-dom";
import ApplicationProgress from "@/components/agent/ApplicationProgress";
import Chat from "@/components/agent/Chat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LeadQualificationDetails from "@/components/agent/LeadQualificationDetails";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

export default function StudentDetailsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { profile, loading: authLoading } = useAuth();
  const tenantId = profile?.tenant_id;
  const { data: student, isLoading, error } = useStudent(studentId || "", tenantId);

  const aiInsights = () => {
    if (!student) {
      return ["Select a student to receive AI prompts on what to add next."];
    }

    const tips: string[] = [];

    if (!student.country) {
      tips.push("Add the student's current country to tailor university and visa guidance.");
    }

    if (student.status === "documents_pending") {
      tips.push("Request transcripts, passport copy, and English proficiency proof to move this file to review.");
    }

    if (!student.email) {
      tips.push("Capture a confirmed email so offer letters and CAS requests reach the student.");
    }

    if (tips.length === 0) {
      tips.push("Profile looks solid — keep advising on deadlines and missing university-specific forms.");
    }

    return tips;
  };

  if (!studentId) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Student not found</AlertTitle>
            <AlertDescription>
              No student ID was provided. Please go back and select a valid student.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <LoadingState message="Loading student details..." size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (isSupabaseConfigured && !tenantId) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load student</AlertTitle>
            <AlertDescription>
              Your account is missing tenant details. Please sign out and sign back in or contact support.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <LoadingState message="Loading student details..." size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load student</AlertTitle>
            <AlertDescription>
              {error.message || "Something went wrong while fetching student details. Please try again."}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Lead file</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {student?.first_name} {student?.last_name}
          </h1>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Latest profile details synced from the CRM.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Email:</span> {student?.email}
                </p>
                <p>
                  <span className="font-medium">Country:</span> {student?.country}
                </p>
                <p>
                  <span className="font-medium">Status:</span> {student?.status}
                </p>
              </CardContent>
            </Card>
            {student && <LeadQualificationDetails lead={student} />}
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              {studentId && <ApplicationProgress studentId={studentId} />}
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full" variant="default">
                  <Link to={`/student/applications/new?studentId=${studentId}`}>
                    Start New Application
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link to={`/courses?view=programs&studentId=${studentId}`}>
                    Browse Programs
                  </Link>
                </Button>
              </div>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI profile coach
                </CardTitle>
                <CardDescription>
                  Prompts to keep this student's profile and documents complete before universities review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {aiInsights().map((tip, index) => (
                  <div
                    key={`${studentId}-tip-${index}`}
                    className="flex items-start gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3"
                  >
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{tip}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        <div>{studentId && <Chat studentId={studentId} />}</div>
      </div>
    </DashboardLayout>
  );
}
