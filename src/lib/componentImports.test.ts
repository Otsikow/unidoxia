import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression guard for the production crash "Input is not defined".
 *
 * Statically checks that every capitalised JSX element used in the marketplace
 * page tree resolves to something declared in the same module (import,
 * const/function/class declaration, or a namespaced member such as Foo.Bar).
 */
const FILES = [
  "src/pages/UniversityProfile.tsx",
  "src/pages/CourseDetail.tsx",
  "src/pages/CourseDiscovery.tsx",
  "src/pages/UniversityClaim.tsx",
  "src/components/course-discovery/ProgramSearchView.tsx",
  "src/components/student/CourseCard.tsx",
];

const declaredNames = (source: string) => {
  const names = new Set<string>(["React", "Fragment"]);

  // import Default, { A, B as C }, * as NS from "..."
  for (const match of source.matchAll(/import\s+([^;]+?)\s+from\s+["'][^"']+["']/g)) {
    const clause = match[1];
    const braced = clause.match(/\{([\s\S]*?)\}/);
    if (braced) {
      for (const part of braced[1].split(",")) {
        const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
        if (name) names.add(name);
      }
    }
    const withoutBraces = clause.replace(/\{[\s\S]*?\}/, "").replace(/,/g, " ");
    for (const token of withoutBraces.split(/\s+/)) {
      const namespaced = token.match(/^\*$/) ? null : token.trim();
      if (namespaced && /^[A-Za-z_$][\w$]*$/.test(namespaced) && namespaced !== "as" && namespaced !== "type") {
        names.add(namespaced);
      }
    }
    const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (ns) names.add(ns[1]);
  }

  // local declarations, including types used in generic positions
  for (const match of source.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:const|let|var|function|class|type|interface)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(match[1]);
  }

  return names;
};

const usedComponents = (source: string) => {
  const used = new Set<string>();
  // The lookbehind skips generic type positions such as useState<University>.
  for (const match of source.matchAll(/(?<![\w$])<([A-Z][\w$]*)(?:\.[\w$]+)*[\s/>]/g)) used.add(match[1]);
  return used;
};

describe("marketplace page component references", () => {
  it.each(FILES)("%s has no undefined JSX component references", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    const declared = declaredNames(source);
    const missing = [...usedComponents(source)].filter((name) => !declared.has(name));
    expect(missing, `Undefined component(s) in ${file}: ${missing.join(", ")}`).toEqual([]);
  });

  it("keeps the Input import that the university profile search box depends on", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/UniversityProfile.tsx"), "utf8");
    expect(source).toMatch(/import\s+\{[^}]*\bInput\b[^}]*\}\s+from\s+["']@\/components\/ui\/input["']/);
    expect(source).toContain("<Input");
  });
});
