import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const directorySource = readFileSync(
  resolve(process.cwd(), "src/pages/UniversityDirectory.tsx"),
  "utf8",
);

describe("UniversityDirectory public presentation", () => {
  it("uses truthful listing language instead of implying partnerships", () => {
    expect(directorySource).toContain("Listed universities • Live data");
    expect(directorySource).toContain("Listing Status");
    expect(directorySource).toContain(">Listed</p>");
    expect(directorySource).not.toMatch(/partner universit(?:y|ies)/i);
    expect(directorySource).not.toContain("Partner Status");
  });

  it("renders every grid card at the same controlled height", () => {
    expect(directorySource).toContain('flex h-[37.5rem] flex-col');
    expect(directorySource).toContain('sm:h-[32.5rem]');
    expect(directorySource).toContain('h-40 w-full flex-shrink-0 sm:h-44');
    expect(directorySource).toContain('mt-auto flex flex-wrap items-center');
    expect(directorySource).not.toContain("items-start gap-4 sm:grid-cols-2");
  });

  it("keeps a clean bottom safe area below the card actions", () => {
    expect(directorySource).toContain("p-4 pb-6 sm:p-5 sm:pb-6");
    expect(directorySource).toContain("border-t border-border/60 pt-3");
  });

  it("keeps variable-length profile content out of summary cards", () => {
    expect(directorySource).not.toContain("university.description ?");
    expect(directorySource).not.toContain("highlights.slice");
    expect(directorySource).not.toContain("tagline ?");
    expect(directorySource).toContain("line-clamp-2 min-h-10");
  });
});
