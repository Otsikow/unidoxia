import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ResizableAdminSidebar } from "./ResizableAdminSidebar";
beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe("admin sidebar resizing", () => {
  it("supports keyboard resizing, limits and width persistence", () => {
    const view = render(
      <ResizableAdminSidebar collapsed={false}>Menu</ResizableAdminSidebar>,
    );
    const handle = screen.getByRole("separator", { name: "Resize sidebar" });
    expect(handle).toHaveAttribute("aria-valuenow", "288");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(
      screen.getByRole("complementary", { name: "Admin sidebar" }),
    ).toHaveStyle({ width: "304px" });
    fireEvent.keyDown(handle, { key: "End" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle).toHaveAttribute("aria-valuenow", "420");
    fireEvent.keyDown(handle, { key: "Home" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(handle).toHaveAttribute("aria-valuenow", "240");
    view.unmount();
    render(
      <ResizableAdminSidebar collapsed={false}>Menu</ResizableAdminSidebar>,
    );
    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-valuenow",
      "240",
    );
  });
  it("keeps the chosen expanded width when collapsed, and can reset it", () => {
    const view = render(
      <ResizableAdminSidebar collapsed={false}>Menu</ResizableAdminSidebar>,
    );
    fireEvent.keyDown(screen.getByRole("separator"), { key: "End" });
    view.rerender(
      <ResizableAdminSidebar collapsed>Menu</ResizableAdminSidebar>,
    );
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "80px" });
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    view.rerender(
      <ResizableAdminSidebar collapsed={false}>Menu</ResizableAdminSidebar>,
    );
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "420px" });
    fireEvent.doubleClick(screen.getByRole("separator"));
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "288px" });
  });
  it("recovers from an invalid saved preference", () => {
    localStorage.setItem("unidoxia.admin.sidebar.width", "invalid");
    render(
      <ResizableAdminSidebar collapsed={false}>Menu</ResizableAdminSidebar>,
    );
    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-valuenow",
      "288",
    );
  });
});
