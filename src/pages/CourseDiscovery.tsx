import { ProgramSearchView } from "@/components/course-discovery/ProgramSearchView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/hooks/useAuth";

export default function CourseDiscovery() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const content = <ProgramSearchView showBackButton={!isAuthenticated} />;

  if (isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="min-h-full w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {content}
        </div>
      </DashboardLayout>
    );
  }

  return <PublicLayout>{content}</PublicLayout>;
}
