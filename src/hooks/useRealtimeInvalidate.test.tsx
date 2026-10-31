import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRealtimeInvalidate } from "./useRealtimeInvalidate";
const fake = vi.hoisted(() => ({
  channels: new Map<string, any>(),
  channel: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (topic: string) => fake.channel(topic),
    removeChannel: (channel: unknown) => fake.remove(channel),
  },
}));
function Listener({
  page = 1,
  tenant = "tenant",
}: {
  page?: number;
  tenant?: string;
}) {
  useRealtimeInvalidate(tenant, ["staff", "tasks", tenant, page], "tasks");
  return null;
}
function setup(children: React.ReactNode) {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...render(children, { wrapper }), invalidate, wrapper };
}
beforeEach(() => {
  vi.resetAllMocks();
  fake.channels.clear();
  fake.remove.mockResolvedValue("ok");
  // Match the real SDK: same topic returns the same channel and callbacks
  // cannot be registered after it has already subscribed.
  fake.channel.mockImplementation((topic: string) => {
    if (fake.channels.has(topic)) return fake.channels.get(topic);
    const channel: any = {
      topic,
      subscribed: false,
      callback: undefined,
      filter: undefined,
      on: vi.fn((_type, filter, callback) => {
        if (channel.subscribed)
          throw new Error("cannot add callbacks after subscribe");
        channel.filter = filter;
        channel.callback = callback;
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
describe("live-query subscription ownership", () => {
  it("mounts several task consumers without colliding and invalidates each query", () => {
    const view = setup(
      <>
        <Listener />
        <Listener page={2} />
        <Listener page={3} />
      </>,
    );
    expect(fake.channel).toHaveBeenCalledTimes(3);
    expect(fake.channels.size).toBe(3);
    act(() => {
      for (const channel of fake.channels.values()) channel.callback();
    });
    expect(view.invalidate).toHaveBeenCalledTimes(3);
    expect(view.invalidate).toHaveBeenCalledWith({
      queryKey: ["staff", "tasks", "tenant", 2],
    });
    for (const channel of fake.channels.values())
      expect(channel.filter).toEqual({
        event: "*",
        schema: "public",
        table: "tasks",
        filter: "tenant_id=eq.tenant",
      });
  });
  it("does not resubscribe when a render creates the same query-key array", () => {
    const view = setup(<Listener />);
    view.rerender(<Listener />);
    expect(fake.channel).toHaveBeenCalledTimes(1);
    expect(fake.remove).not.toHaveBeenCalled();
  });
  it("changes subscription for a new page/scope and ignores the removed callback", () => {
    const view = setup(<Listener />);
    const old = [...fake.channels.values()][0];
    view.rerender(<Listener page={2} tenant="other" />);
    expect(fake.remove).toHaveBeenCalledWith(old);
    act(() => old.callback());
    expect(view.invalidate).not.toHaveBeenCalled();
    const current = [...fake.channels.values()][1];
    act(() => current.callback());
    expect(view.invalidate).toHaveBeenCalledWith({
      queryKey: ["staff", "tasks", "other", 2],
    });
  });
  it("owns cleanup and remains safe during StrictMode effect replay and rapid remount", () => {
    const first = setup(
      <StrictMode>
        <Listener />
      </StrictMode>,
    );
    expect(fake.channels.size).toBe(2);
    first.unmount();
    const second = setup(<Listener />);
    expect(fake.channels.size).toBe(3);
    second.unmount();
    expect(fake.remove).toHaveBeenCalledTimes(3);
  });
  it("does not subscribe without a scope and keeps realtime setup failure non-fatal", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const missing = setup(<Listener tenant="" />);
    expect(fake.channel).not.toHaveBeenCalled();
    missing.unmount();
    fake.channel.mockImplementation(() => {
      throw new Error("transport unavailable");
    });
    expect(() => setup(<Listener />)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
