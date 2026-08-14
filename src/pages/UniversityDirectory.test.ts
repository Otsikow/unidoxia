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

  it("keeps sparse university cards compact instead of stretching each row", () => {
    expect(directorySource).toContain("grid grid-cols-1 items-start gap-4");
    expect(directorySource).not.toContain(
      'hover:shadow-lg h-full flex flex-col',
    );
    expect(directorySource).not.toContain(
      'justify-end gap-1.5 mt-auto',
    );
  });
});
