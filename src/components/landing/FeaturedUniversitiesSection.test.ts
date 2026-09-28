import { describe, expect, it } from "vitest";
import { getPlaceholderBanner } from "@/lib/featuredUniversityBanners";

describe("getPlaceholderBanner", () => {
  it("uses distinct city artwork before the shared country fallback", () => {
    const york = getPlaceholderBanner("York St John University", "United Kingdom", "York");
    const wrexham = getPlaceholderBanner("Wrexham University", "United Kingdom", "Wrexham");
    const chester = getPlaceholderBanner("University of Chester", "United Kingdom", "Chester");

    expect(new Set([york, wrexham, chester]).size).toBe(3);
  });

  it("keeps the country fallback for unrecognised cities", () => {
    expect(getPlaceholderBanner("Example University", "United Kingdom", "Unknown"))
      .toContain("images.unsplash.com");
  });
});
