import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SuccessStoriesMarquee } from "./SuccessStoriesMarquee";
import { StoryboardSection } from "./StoryboardSection";
import { ZoeExperienceSection } from "./ZoeExperienceSection";

const renderWithRouter = (ui: ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("homepage credibility sections", () => {
  it("shows factual trust information without fictional testimonials", () => {
    const { container } = renderWithRouter(<SuccessStoriesMarquee />);

    expect(screen.getByRole("heading", { name: /practical support without invented success claims/i })).toBeTruthy();
    expect(screen.getByText(/does not guarantee admission, scholarships or visas/i)).toBeTruthy();
    expect(container.textContent).not.toMatch(/MIT|Oxford|Stanford|University of Toronto|Verified success stories/i);
  });

  it("describes Zoe as guidance and includes an outcomes disclaimer", () => {
    renderWithRouter(<ZoeExperienceSection />);

    expect(screen.getByRole("heading", { name: /find your way through the study journey/i })).toBeTruthy();
    expect(screen.getByText(/not a guarantee of admission, funding or a visa/i)).toBeTruthy();
  });

  it("keeps the three-step journey clear without guaranteed matching or outcomes", () => {
    const { container } = renderWithRouter(<StoryboardSection />);

    expect(screen.getByRole("heading", { name: /your journey in 3 clear steps/i })).toBeTruthy();
    expect(screen.getByText(/admission and visa decisions remain solely/i)).toBeTruthy();
    expect(container.textContent).not.toMatch(/verified advisors|dream university|universities love/i);
  });

  it("makes every journey card actionable and preserves its post-registration destination", () => {
    renderWithRouter(<StoryboardSection />);

    expect(screen.getByRole("link", { name: /build your profile.*register or sign in/i })).toHaveAttribute(
      "href",
      "/auth/signup?role=student&next=%2Fstudent%2Fprofile",
    );
    expect(screen.getByRole("link", { name: /explore universities.*register or sign in/i })).toHaveAttribute(
      "href",
      "/auth/signup?role=student&next=%2Fstudent%2Funiversities",
    );
    expect(screen.getByRole("link", { name: /start an application.*register or sign in/i })).toHaveAttribute(
      "href",
      "/auth/signup?role=student&next=%2Fstudent%2Fapplications%2Fnew",
    );
  });
});
