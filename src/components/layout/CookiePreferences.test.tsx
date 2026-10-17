import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsent } from "./CookieConsent";
import { getConsentPreferences } from "@/lib/cookieConsent";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const mount = () =>
  render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );
describe("cookie preferences", () => {
  it("keeps optional cookies off, saves only on confirmation, and restores the saved choice", () => {
    const view = mount();
    expect(getConsentPreferences()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cookie preferences" }));
    expect(
      screen.getByRole("checkbox", { name: "Analytics" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Marketing and advertising" }),
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Analytics" }));
    expect(getConsentPreferences()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(getConsentPreferences()).toEqual({
      analytics: true,
      marketing: false,
    });
    view.unmount();
    mount();
    expect(
      screen.queryByRole("button", { name: "Accept all" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(screen.getByRole("checkbox", { name: "Analytics" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Marketing and advertising" }),
    ).not.toBeChecked();
  });
  it("can accept all or save essential only and reopen from an external control", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Essential only" }));
    expect(getConsentPreferences()).toEqual({
      analytics: false,
      marketing: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept all" }));
    expect(getConsentPreferences()).toEqual({
      analytics: true,
      marketing: true,
    });
  });
  it("keeps a failed save visible and optional cookies blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Accept all" }));
    expect(screen.getByRole("alert")).toHaveTextContent("could not save");
    expect(getConsentPreferences()).toBeNull();
    expect(
      screen.getByRole("button", { name: "Essential only" }),
    ).toBeVisible();
  });
  it("does not save unsaved changes when the settings are closed", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Cookie preferences" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Analytics" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(getConsentPreferences()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cookie preferences" }));
    expect(
      screen.getByRole("checkbox", { name: "Analytics" }),
    ).not.toBeChecked();
  });
});
