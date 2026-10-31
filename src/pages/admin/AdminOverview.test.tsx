import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminOverview from "./AdminOverview";
const fake = vi.hoisted(() => ({
  home: {} as Record<string, any>,
  refetch: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin" }, profile: { tenant_id: "tenant" } }),
}));
vi.mock("@/hooks/admin/useAdminHome", () => ({
  useAdminHome: () => fake.home,
}));
vi.mock("@/components/admin/AdminReportExportButton", () => ({
  default: () => <button>Export reports</button>,
}));
vi.mock("@/components/applications/ChooseApplicationStudent", () => ({
  ChooseApplicationStudent: ({ open }: { open: boolean }) =>
    open ? <p>Choose a student</p> : null,
}));
function show() {
  return render(
    <MemoryRouter>
      <AdminOverview />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  const query = (data: unknown) => ({
    data,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: fake.refetch,
  });
  fake.home = {
    students: query({ students: 71, documentsToReview: 3 }),
    applications: query({
      active: 1,
      attention: 1,
      total: 1,
      pipelineTotal: 1,
      pipeline: [
        { label: "UniDoxia review", count: 1, className: "bg-blue-500" },
      ],
      priorities: [
        {
          id: "app",
          app_number: "DEMO-1",
          status: "submitted",
          student: { legal_name: "Test student" },
          program: { name: "Test course" },
          documents: [],
          tasks: [],
        },
      ],
    }),
    tasks: query({ overdue: 0, open: 2, priorities: [] }),
    taskScopeAvailable: true,
  };
});
describe("professional admissions overview", () => {
  it("shows four operational summaries with links to the matching queues", () => {
    show();
    expect(
      screen.getByRole("link", { name: /Open students$/ }),
    ).toHaveAttribute("href", "/admin/students");
    expect(
      screen.getByRole("link", { name: /Open applications$/ }),
    ).toHaveAttribute("href", "/admin/applications?stage=active");
    expect(
      screen.getByRole("link", { name: /Review documents$/ }),
    ).toHaveAttribute("href", "/admin/students?view=review");
    expect(
      screen.getByRole("link", { name: /Open team tasks$/ }),
    ).toHaveAttribute("href", "/admin/tasks");
    expect(screen.getByText("71")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
  it("opens the real selected application and the student-first new-application picker", async () => {
    show();
    expect(screen.getByRole("link", { name: /Test student/ })).toHaveAttribute(
      "href",
      "/admin/applications?application=app",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "New application" }),
    );
    expect(screen.getByText("Choose a student")).toBeInTheDocument();
  });
  it("shows unavailable states rather than false zeros or health claims", () => {
    fake.home.students = {
      ...fake.home.students,
      data: undefined,
      isError: true,
    };
    fake.home.tasks = { ...fake.home.tasks, data: undefined, isError: true };
    fake.home.applications = {
      ...fake.home.applications,
      data: undefined,
      isError: true,
    };
    show();
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(screen.queryByText("Operational")).not.toBeInTheDocument();
    expect(screen.queryByText("US$0")).not.toBeInTheDocument();
  });
  it("does not turn loading or an unavailable task scope into a no-work claim", () => {
    fake.home.applications = {
      ...fake.home.applications,
      data: undefined,
      isPending: true,
    };
    fake.home.tasks = { ...fake.home.tasks, data: undefined, isPending: true };
    fake.home.taskScopeAvailable = false;
    show();
    expect(screen.getAllByLabelText("Loading overview")).toHaveLength(2);
    expect(
      screen.queryByText("No overdue or blocked follow-ups in this workspace."),
    ).not.toBeInTheDocument();
  });
  it("refreshes each independent source and preserves reporting and finance access", async () => {
    show();
    await userEvent.click(
      screen.getByRole("button", { name: "Refresh overview" }),
    );
    expect(fake.refetch).toHaveBeenCalledTimes(3);
    expect(
      screen.getByRole("link", { name: /Reports & finances/ }),
    ).toHaveAttribute("href", "/admin/reports");
    expect(screen.getByRole("link", { name: "Commissions" })).toHaveAttribute(
      "href",
      "/admin/commissions",
    );
    expect(
      screen.getByRole("button", { name: "Export reports" }),
    ).toBeInTheDocument();
  });
});
