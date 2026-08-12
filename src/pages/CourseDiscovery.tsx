import { ProgramSearchView } from "@/components/course-discovery/ProgramSearchView";
import { PublicLayout } from "@/components/layout/PublicLayout";

export default function CourseDiscovery() {
  return (
    <PublicLayout>
      <ProgramSearchView showBackButton={false} />
    </PublicLayout>
  );
}
