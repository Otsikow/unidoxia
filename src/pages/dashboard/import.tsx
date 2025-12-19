import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import BulkImport from "@/components/agent/BulkImport";

export default function ImportPage() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 md:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Import Students
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload CSV files to add prospective students in bulk and monitor
            import progress in one place.
          </p>
        </div>

        <BulkImport />
      </div>
    </DashboardLayout>
  );
}
