import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessagingViewport } from "./MessagingViewport";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("messaging available height", () => {
  it("measures below its real header and updates when the viewport resizes", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 120,
    } as DOMRect);
    vi.stubGlobal("innerHeight", 900);
    const view = render(
      <MessagingViewport>
        <span>Chat</span>
      </MessagingViewport>,
    );
    expect(screen.getByText("Chat").parentElement).toHaveStyle({
      height: "764px",
    });
    act(() => {
      vi.stubGlobal("innerHeight", 700);
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByText("Chat").parentElement).toHaveStyle({
      height: "564px",
    });
    const remove = vi.spyOn(window, "removeEventListener");
    view.unmount();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
    vi.unstubAllGlobals();
  });
  it("updates the mobile chat height and offset when the visual viewport changes", () => {
    const viewport = new EventTarget();
    Object.defineProperties(viewport, {
      height: { value: 500, writable: true },
      offsetTop: { value: 0, writable: true },
    });
    vi.stubGlobal("visualViewport", viewport);
    render(
      <MessagingViewport>
        <span>Chat</span>
      </MessagingViewport>,
    );
    const container = screen.getByText("Chat").parentElement!;
    expect(container.style.getPropertyValue("--messaging-screen-height")).toBe(
      "500px",
    );
    act(() => {
      Object.defineProperty(viewport, "height", { value: 320 });
      Object.defineProperty(viewport, "offsetTop", { value: 80 });
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(container.style.getPropertyValue("--messaging-screen-height")).toBe(
      "320px",
    );
    expect(container.style.getPropertyValue("--messaging-screen-top")).toBe(
      "80px",
    );
  });
});
