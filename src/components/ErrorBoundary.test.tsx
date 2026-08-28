import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

const Boom = ({ message }: { message: string }) => {
  throw new ReferenceError(message);
};

describe("ErrorBoundary production messaging", () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleError.mockRestore();
  });

  it("never renders the raw runtime exception text to users", () => {
    render(
      <ErrorBoundary>
        <Boom message="Input is not defined" />
      </ErrorBoundary>,
    );

    expect(screen.queryByText(/Input is not defined/)).toBeNull();
    // i18n is not initialised under test, so the generic key is rendered verbatim.
    expect(screen.getByText(/app\.errorBoundary\.genericMessage/)).toBeTruthy();
  });

  it("still reports the real exception for diagnostics", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Boom message="Input is not defined" />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalled();
    expect((onError.mock.calls[0][0] as Error).message).toBe("Input is not defined");
    expect(consoleError).toHaveBeenCalled();
  });

  it("keeps retry and home navigation available", () => {
    render(
      <ErrorBoundary>
        <Boom message="Input is not defined" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: /tryAgainCount/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /goHome/i })).toBeTruthy();
  });
});
