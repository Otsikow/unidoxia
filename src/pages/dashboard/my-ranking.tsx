import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import PreferenceRanking from "@/components/ranking/PreferenceRanking";

export default function MyRankingPage() {
  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 md:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            My Ranking
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare partner programs, prioritize follow-ups, and focus on
            high-impact opportunities.
          </p>
        </div>

        <PreferenceRanking />
      </div>
    </DashboardLayout>
  );
}
