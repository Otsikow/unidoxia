import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("uses intrinsic height by default instead of stretching to the grid row", () => {
    const { container } = render(<Card>Content</Card>);

    expect(container.firstElementChild?.className).toContain("self-start");
  });

  it("preserves explicit equal-height card layouts", () => {
    const { container } = render(<Card className="h-full">Content</Card>);

    expect(container.firstElementChild?.className).toContain("self-start");
    expect(container.firstElementChild?.className).toContain("h-full");
  });
});
