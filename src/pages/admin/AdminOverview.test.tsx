import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminOverview from "./AdminOverview";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: { tenant_id: "tenant-1", role: "admin" } }),
}));

vi.mock("@/components/admin/AdminReportExportButton", () => ({
  default: () => <button type="button">Export</button>,
}));

vi.mock("@/hooks/admin/useAdminOverviewData", () => ({
  useAdminOverviewMetrics: () => ({
    data: {
      totalStudents: 42,
      totalAgents: 7,
      totalUniversities: 5,
      activeApplications: 18,
      totalCommissionPaid: 1200,
      pendingVerifications: 3,
      currency: "USD",
      lastUpdated: new Date().toISOString(),
    },
    isLoading: false,
  }),
  useAdmissionsTrends: () => ({
    data: [{ month: "Jan", submitted: 4, enrolled: 2 }],
    isLoading: false,
  }),
  useApplicationsByCountry: () => ({
    data: [{ country: "United Kingdom", applications: 12 }],
    isLoading: false,
  }),
  useAdminRecentActivity: () => ({
    data: Array.from({ length: 10 }, (_, index) => ({
      id: `log-${index}`,
      action: `Action ${index}`,
      entity: "applications",
      created_at: new Date().toISOString(),
      user: null,
    })),
    isLoading: false,
  }),
  useSystemHealth: () => ({
    data: { status: "operational", score: 0, incidents: [], updatedAt: "", recommendations: [] },
    isLoading: false,
  }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminOverview />
    </MemoryRouter>,
  );

describe("AdminOverview", () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it("shows exactly four essential KPI panels", () => {
    renderPage();

    const kpis = ["Active applications", "Students", "Needs review", "Commission paid"];
    kpis.forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    });
  });

  it("does not embed the student insights block, admissions oversight page, or a large Zoe textarea", () => {
    const { container } = renderPage();

    expect(screen.queryByText("Student insights")).not.toBeInTheDocument();
    expect(screen.queryByText(/Admissions oversight/i)).not.toBeInTheDocument();
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("navigates to the verification queue from the action centre", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Verification queue/i }));

    expect(navigate).toHaveBeenCalledWith("/admin/agents");
  });

  it("activates KPI panels with the keyboard", () => {
    renderPage();

    fireEvent.keyDown(screen.getByRole("button", { name: "Students" }), { key: "Enter" });

    expect(navigate).toHaveBeenCalledWith("/admin/students");
  });

  it("limits recent activity to six items and links to the logs page", () => {
    renderPage();

    expect(screen.getAllByText(/^Action \d$/)).toHaveLength(6);

    fireEvent.click(screen.getByRole("button", { name: /View all/i }));
    expect(navigate).toHaveBeenCalledWith("/admin/logs");
  });
});
