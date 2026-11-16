import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import en from "@/i18n/locales/en";
import de from "@/i18n/locales/de";
import fr from "@/i18n/locales/fr";
import pt from "@/i18n/locales/pt";

const BANNED = [
  "Full guidance from application to visa",
  "Visa preparation assistance",
  "95% visa success rate",
  "comprehensive visa support",
  "comprehensive visa guidance",
  "Visa Guidance",
];

const SOURCE_ROOTS = [
  join(process.cwd(), "src"),
  join(process.cwd(), "scripts"),
  join(process.cwd(), "supabase/functions"),
  join(process.cwd(), "public/llms.txt"),
];

function collectFiles(entry: string, acc: string[] = []): string[] {
  const st = statSync(entry);
  if (st.isFile()) {
    if (/\.(test|spec)\.(ts|tsx|js|mjs)$/.test(entry)) return acc;
    if (/\.(ts|tsx|js|mjs|cjs|json|txt|html)$/.test(entry)) acc.push(entry);
    return acc;
  }
  if (!st.isDirectory()) return acc;
  for (const name of readdirSync(entry)) {
    if (name === "node_modules" || name === "dist" || name === ".vite-cache") continue;
    collectFiles(join(entry, name), acc);
  }
  return acc;
}

describe("Kojo 16 Nov visa wording", () => {
  it("keeps banned service claims out of live app copy and locales", () => {
    const files = SOURCE_ROOTS.flatMap((root) => collectFiles(root));
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const phrase of BANNED) {
        if (text.includes(phrase)) {
          hits.push(`${relative(process.cwd(), file)}: ${phrase}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("does not keep the 95% visa-success metric in translated journey copy", () => {
    const blobs = [en, de, fr, pt].map((locale) => JSON.stringify(locale));
    for (const blob of blobs) {
      expect(blob).not.toMatch(/Visa-Erfolgsquote|taux de réussite visa|taxa de sucesso de visto|visa success rate/);
      expect(blob).not.toMatch(/"95%"/);
    }
  });
});
