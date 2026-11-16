import "@testing-library/jest-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import VisaCalculatorPage from "./VisaCalculator";
import {
  OTHER_COUNTRY_VISA_INFORMATION_LINKS,
  UK_VISA_INFORMATION_LINKS,
  VISA_INFORMATION_CTA,
  VISA_INFORMATION_LONG_DISCLAIMER,
  VISA_INFORMATION_SHORT_DISCLAIMER,
} from "@/lib/visaInformationLinks";

const BANNED_ON_PAGE =
  /\bELIGIBLE\b|\bNOT ELIGIBLE\b|\beligible\b|\bprobability\b|success rate|\bAI\b|\bpredictor\b|probability band|guiding you end to end/i;

describe("visa information page", () => {
  it("shows the links-only page and none of the old calculator verdicts", () => {
    const { container } = render(
      <MemoryRouter>
        <VisaCalculatorPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Visa information" })).toBeTruthy();
    const notice = screen.getByRole("note", { name: "Immigration advice disclaimer" });
    expect(notice).toHaveTextContent(VISA_INFORMATION_SHORT_DISCLAIMER);
    expect(notice).toHaveTextContent(VISA_INFORMATION_LONG_DISCLAIMER);

    for (const link of [...UK_VISA_INFORMATION_LINKS, ...OTHER_COUNTRY_VISA_INFORMATION_LINKS]) {
      expect(screen.getByRole("link", { name: link.label, exact: true })).toHaveAttribute("href", link.href);
    }

    expect(screen.getByRole("link", { name: VISA_INFORMATION_CTA })).toHaveAttribute(
      "href",
      "/free-consultation",
    );

    expect(container.textContent).not.toMatch(BANNED_ON_PAGE);
    expect(container.querySelector("input, select, textarea")).toBeNull();
  });

  it("fails if banned calculator wording is in the page source", () => {
    const source = [
      readFileSync(join(process.cwd(), "src/pages/VisaCalculator.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/visaInformationLinks.ts"), "utf8"),
    ].join("\n");
    expect(source).not.toMatch(BANNED_ON_PAGE);
  });

  it("does not keep the student visa-eligibility estimator", () => {
    const estimator = join(process.cwd(), "src/pages/student/VisaEligibility.tsx");
    expect(() => readFileSync(estimator, "utf8")).toThrow();
    const app = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
    expect(app).not.toMatch(/VisaEligibility/);
    expect(app).toMatch(/path="visa"[\s\S]*Navigate to="\/visa-calculator"/);
  });
});
