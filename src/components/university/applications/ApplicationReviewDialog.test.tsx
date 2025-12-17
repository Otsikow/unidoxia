import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import {
  ApplicationReviewDialog,
  type ExtendedApplication,
} from "./ApplicationReviewDialog";

const rpcMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const authGetUserMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
    auth: { getUser: authGetUserMock },
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(),
        getPublicUrl: vi.fn(() => ({ publicUrl: null })),
      })),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/components/ui/select", () => {
  const Select = ({ value, onValueChange, children, ...props }: any) => (
    <select
      aria-label="New Status"
      value={value ?? ""}
      onChange={(event) => onValueChange?.(event.target.value)}
      {...props}
    >
      {children}
    </select>
  );

  const SelectContent = ({ children }: any) => children;
  const SelectTrigger = () => null;
  const SelectValue = () => null;
  const SelectItem = ({ value, children, ...props }: any) => (
    <option value={value} {...props}>
      {children}
    </option>
  );

  return {
    Select,
    SelectContent,
    SelectTrigger,
    SelectValue,
    SelectItem,
  };
});

const baseApplication: ExtendedApplication = {
  id: "app-1",
  appNumber: "APP-1",
  status: "submitted",
  createdAt: "2024-01-01T00:00:00Z",
  submittedAt: "2024-01-01T00:00:00Z",
  updatedAt: null,
  programId: "program-1",
  programName: "Computer Science",
  programLevel: "Bachelor",
  programDiscipline: "STEM",
  intakeMonth: 1,
  intakeYear: 2025,
  studentId: "student-1",
  studentName: "Student One",
  studentNationality: "USA",
  agentId: null,
  notes: null,
  internalNotes: null,
  timelineJson: [],
  student: null,
  documents: [],
};

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
  authGetUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  toastMock.mockReset();

  fromMock.mockImplementation(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        limit: vi.fn(async () => ({ data: [], error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
  }));
});

const openDialog = async (statusValue: string) => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  const select = await screen.findByRole("combobox", { name: /new status/i });
  await user.selectOptions(select, statusValue);
  await user.click(screen.getByRole("button", { name: /update status/i }));
  await user.click(screen.getByRole("button", { name: /confirm change/i }));
};

describe("confirmStatusChange", () => {
  test("falls back through RPCs in order until one succeeds", async () => {
    const rpcCalls: string[] = [];
    rpcMock.mockImplementation(async (fnName) => {
      rpcCalls.push(fnName as string);

      if (fnName === "diagnose_app_update_issue") {
        return { data: null, error: null };
      }

      if (fnName === "university_update_application_status") {
        return {
          data: null,
          error: { code: "PGRST202", message: "Function not found" },
        };
      }

      if (fnName === "update_application_review_text") {
        return {
          data: null,
          error: { code: "PGRST202", message: "Function not found" },
        };
      }

      if (fnName === "update_application_review") {
        return {
          data: [
            {
              id: baseApplication.id,
              status: "visa",
              updated_at: "2024-02-01T00:00:00Z",
            },
          ],
          error: null,
        };
      }

      throw new Error(`Unexpected RPC ${fnName}`);
    });

    const onStatusUpdate = vi.fn();

    render(
      <MemoryRouter>
        <ApplicationReviewDialog
          application={baseApplication}
          open
          onOpenChange={() => {}}
          onStatusUpdate={onStatusUpdate}
          tenantId="tenant-1"
        />
      </MemoryRouter>,
    );

    await openDialog("visa");

    await waitFor(() => {
      expect(onStatusUpdate).toHaveBeenCalledWith(baseApplication.id, "visa");
    });

    expect(rpcCalls).toEqual([
      "diagnose_app_update_issue",
      "university_update_application_status",
      "update_application_review_text",
      "update_application_review",
    ]);
  });

  test("shows a helpful error toast when permission is denied", async () => {
    rpcMock.mockImplementation(async (fnName) => {
      if (fnName === "diagnose_app_update_issue") {
        return { data: null, error: null };
      }

      if (fnName === "university_update_application_status") {
        return {
          data: null,
          error: {
            code: "42501",
            message:
              "Your account is not linked to a university (tenant_id is NULL). Please contact support.",
          },
        };
      }

      throw new Error(`Unexpected RPC ${fnName}`);
    });

    render(
      <MemoryRouter>
        <ApplicationReviewDialog
          application={baseApplication}
          open
          onOpenChange={() => {}}
          tenantId="tenant-1"
        />
      </MemoryRouter>,
    );

    await openDialog("visa");

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });

    const toastArgs = toastMock.mock.calls.at(-1)?.[0];
    expect(toastArgs).toMatchObject({
      title: "Account not linked to university",
      variant: "destructive",
      duration: 10000,
    });
    expect(toastArgs.description).toContain("tenant_id is missing");
  });
});
