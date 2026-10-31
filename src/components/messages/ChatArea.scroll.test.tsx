import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatArea } from "./ChatArea";
import type { Conversation, Message } from "@/types/messaging";
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "staff" } }),
}));
vi.mock("./MessageInput", () => ({
  MessageInput: () => <textarea aria-label="Reply" />,
}));
const scroll = vi.fn();
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollTo = scroll;
  scroll.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const conversation = {
  id: "chat",
  title: "Sample",
  is_group: true,
  participants: [],
} as Conversation;
const message = {
  id: "one",
  conversation_id: "chat",
  sender_id: "staff",
  content: "Test message",
  message_type: "text",
  attachments: [],
  created_at: "2026-10-31T10:00:00Z",
} as Message;
const base = {
  conversation,
  messages: [message],
  typingUsers: [],
  loading: false,
  onSendMessage: vi.fn(),
  onStartTyping: vi.fn(),
  onStopTyping: vi.fn(),
};
describe("message history scrolling", () => {
  it("attaches scrolling after loading and preserves position when new messages arrive while reading older messages", () => {
    const view = render(<ChatArea {...base} loading />);
    view.rerender(<ChatArea {...base} />);
    const history = screen.getByRole("region", { name: "Message history" });
    Object.defineProperties(history, {
      scrollHeight: { value: 1000, configurable: true },
      clientHeight: { value: 200, configurable: true },
    });
    history.scrollTop = 0;
    fireEvent.scroll(history);
    scroll.mockClear();
    view.rerender(
      <ChatArea
        {...base}
        messages={[message, { ...message, id: "two", content: "New message" }]}
      />,
    );
    expect(scroll).not.toHaveBeenCalled();
    history.scrollTop = 800;
    fireEvent.scroll(history);
    view.rerender(
      <ChatArea
        {...base}
        messages={[
          message,
          { ...message, id: "three", content: "Latest message" },
        ]}
      />,
    );
    expect(scroll).toHaveBeenCalled();
    expect(screen.getByLabelText("Reply")).toBeInTheDocument();
  });
});
