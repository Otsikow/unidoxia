import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentDocumentRequests } from "./StudentDocumentRequests";
const fake = vi.hoisted(() => ({
  read: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  result: vi.fn(),
  scope: vi.fn(),
  role: "admin",
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "staff" }, profile: { role: fake.role } }),
}));
vi.mock("@/lib/documentUpload", () => ({
  getDocumentRequestUrl: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: (...args: unknown[]) => {
          fake.scope(...args);
          return chain;
        },
        is: (...args: unknown[]) => {
          fake.scope(...args);
          return chain;
        },
        order: () => chain,
        range: fake.read,
        single: fake.result,
        maybeSingle: fake.result,
        insert: (value: unknown) => {
          fake.insert(value);
          return chain;
        },
        update: (value: unknown) => {
          fake.update(value);
          return chain;
        },
      };
      return chain;
    },
  },
}));
const request = {
  id: "request",
  student_id: "student",
  document_type: "passport",
  status: "pending",
  description: "Clear passport scan",
  storage_path: null,
  updated_at: "2026-10-31T10:00:00Z",
};
function show() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      <StudentDocumentRequests
        studentId="student"
        tenantId="tenant"
        documents={[
          {
            id: "doc",
            document_type: "passport",
            storage_path: "app/passport",
            verified: false,
          },
        ]}
      />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  fake.role = "admin";
  fake.read.mockResolvedValue({ data: [], error: null });
  fake.result.mockResolvedValue({ data: { id: "request" }, error: null });
});
afterEach(cleanup);
async function click(name: string) {
  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name }));
  });
}
describe("staff student-document request loop", () => {
  it("creates a portal request using the selected student/tenant and staff identity", async () => {
    show();
    await screen.findByText("No document requests recorded for this student.");
    await click("Request a document");
    await act(async () => {
      await userEvent.type(
        screen.getByLabelText("What is needed?"),
        "Upload a readable passport scan",
      );
    });
    await click("Save document request");
    expect(fake.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "student",
        tenant_id: "tenant",
        requested_by: "staff",
        status: "pending",
        document_type: "passport",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "no email or WhatsApp message was sent",
    );
  });
  it("prevents duplicate unfinished requests", async () => {
    fake.read.mockResolvedValue({ data: [request], error: null });
    show();
    await screen.findByText("Clear passport scan");
    await click("Request a document");
    await act(async () => {
      await userEvent.type(
        screen.getByLabelText("What is needed?"),
        "Passport",
      );
    });
    await click("Save document request");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "unfinished request",
    );
    expect(fake.insert).not.toHaveBeenCalled();
  });
  it("requires a file and replacement feedback, then saves a scoped review with concurrency protection", async () => {
    fake.read.mockResolvedValue({ data: [request], error: null });
    show();
    await screen.findByText("Clear passport scan");
    await click("Approve request");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose an uploaded",
    );
    await act(async () => {
      await userEvent.selectOptions(
        screen.getByLabelText("Review an uploaded file"),
        "doc",
      );
    });
    await click("Request replacement");
    expect(await screen.findByRole("alert")).toHaveTextContent("Explain what");
    await act(async () => {
      await userEvent.type(
        screen.getByLabelText("Feedback for student"),
        "Please include all four corners",
      );
    });
    await click("Request replacement");
    expect(fake.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "rejected",
        storage_path: "app/passport",
        reviewed_by: "staff",
        notes: "Please include all four corners",
      }),
    );
    expect(fake.scope).toHaveBeenCalledWith("student_id", "student");
    expect(fake.scope).toHaveBeenCalledWith("updated_at", request.updated_at);
  });
  it("reports permission loss or concurrent changes without a success message", async () => {
    fake.read.mockResolvedValue({
      data: [{ ...request, storage_path: "app/passport" }],
      error: null,
    });
    fake.result.mockResolvedValue({ data: null, error: null });
    show();
    await screen.findByText("Clear passport scan");
    await click("Approve request");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "request changed",
    );
    expect(screen.queryByText(/Request approved/)).not.toBeInTheDocument();
  });
  it("keeps request management unavailable to agent accounts", async () => {
    fake.role = "agent";
    show();
    await screen.findByText("No document requests recorded for this student.");
    expect(
      screen.queryByRole("button", { name: "Request a document" }),
    ).not.toBeInTheDocument();
  });
});
