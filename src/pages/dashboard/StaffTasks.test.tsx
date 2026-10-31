import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import StaffTasks from "./StaffTasks";
const fake = vi.hoisted(() => ({
  channels: new Map<string, any>(),
  channel: vi.fn(),
  remove: vi.fn(),
  reads: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "staff" },
    profile: {
      id: "staff",
      tenant_id: "tenant",
      role: "admin",
      full_name: "Test admin",
    },
    signOut: vi.fn(),
  }),
}));
vi.mock("@/hooks/useUserRoles", () => ({
  useUserRoles: () => ({
    primaryRole: "admin",
    loading: false,
    hasRole: () => true,
  }),
}));
vi.mock("@/hooks/usePageViewTracking", () => ({
  usePageViewTracking: vi.fn(),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/agent/AgentAgreementGate", () => ({
  AgentAgreementGate: () => null,
}));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));
vi.mock("@/components/BackButton", () => ({ default: () => null }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (name: string) => fake.channel(name),
    removeChannel: (channel: unknown) => fake.remove(channel),
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        order: () => chain,
        eq: () => chain,
        in: () => chain,
        range: () => chain,
        ilike: () => chain,
        then: (
          resolve: (result: unknown) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(fake.reads(table)).then(resolve, reject),
      };
      return chain;
    },
  },
}));
const rawTask = {
  id: "task",
  title: "Review synthetic student statement",
  description: null,
  status: "open",
  priority: "medium",
  due_at: "2026-11-02T23:59:59Z",
  created_at: "2026-10-31T09:00:00Z",
  created_by: "staff",
  assignee_id: "staff",
  application_id: null,
  assignee_profile: { full_name: "Test admin", email: "admin@example.test" },
};
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminLayout>
          <StaffTasks />
        </AdminLayout>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  fake.channels.clear();
  fake.remove.mockResolvedValue("ok");
  fake.reads.mockImplementation((table: string) => ({
    data:
      table === "tasks"
        ? [rawTask]
        : [
            {
              id: "staff",
              full_name: "Test admin",
              role: "admin",
              email: "admin@example.test",
            },
          ],
    count: 1,
    error: null,
  }));
  fake.channel.mockImplementation((topic: string) => {
    if (fake.channels.has(topic)) return fake.channels.get(topic);
    const channel: any = {
      subscribed: false,
      on: vi.fn(() => {
        if (channel.subscribed)
          throw new Error("cannot add callbacks after subscribe");
        return channel;
      }),
      subscribe: vi.fn(() => {
        channel.subscribed = true;
        return channel;
      }),
    };
    fake.channels.set(topic, channel);
    return channel;
  });
});
describe("actual Tasks page inside the unified admin shell", () => {
  it("loads summary, automation panel, board and composer without colliding subscriptions", async () => {
    show();
    expect((await screen.findAllByText(rawTask.title)).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Task health snapshot")).toBeInTheDocument();
    expect(screen.getByText("Tasks & Workflows")).toBeInTheDocument();
    expect(screen.getAllByText("Admin Control Centre")).toHaveLength(1);
    await waitFor(() => expect(fake.channel).toHaveBeenCalledTimes(3));
    expect(fake.channels.size).toBe(3);
    await userEvent.click(
      screen.getAllByRole("button", { name: /Add task/ })[0],
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Create a manual task",
    );
    expect(fake.channel).toHaveBeenCalledTimes(3);
  });
  it("still displays authorised tasks if realtime setup is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.channel.mockImplementation(() => {
      throw new Error("transport unavailable");
    });
    show();
    expect((await screen.findAllByText(rawTask.title)).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Tasks & Workflows")).toBeInTheDocument();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
