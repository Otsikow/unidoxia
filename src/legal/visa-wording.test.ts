import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import en from "@/i18n/locales/en";
import de from "@/i18n/locales/de";
import fr from "@/i18n/locales/fr";
import pt from "@/i18n/locales/pt";
import es from "@/i18n/locales/es";
import itLocale from "@/i18n/locales/it";
import ar from "@/i18n/locales/ar";
import hi from "@/i18n/locales/hi";
import sw from "@/i18n/locales/sw";
import zh from "@/i18n/locales/zh";

const LOCALES = { en, de, fr, pt, es, it: itLocale, ar, hi, sw, zh };

const BANNED = [
  "comprehensive visa",
  "umfassende Visa",
  "accompagnement visa",
  "completa de visto",
  "completo de visto",
  "Visa checklists",
  "24h",
  "average match time",
  "durchschnittliche Matching-Zeit",
  "délai moyen de matching",
  "tempo médio de matching",
];

const SOURCE_ROOTS = [
  join(process.cwd(), "src/i18n/locales"),
];

function collectFiles(entry: string, acc: string[] = []): string[] {
  const st = statSync(entry);
  if (st.isFile()) {
    if (/\.(test|spec)\.(ts|tsx|js|mjs)$/.test(entry)) return acc;
    if (/\.(ts|tsx|js|mjs)$/.test(entry)) acc.push(entry);
    return acc;
  }
  if (!st.isDirectory()) return acc;
  for (const name of readdirSync(entry)) {
    collectFiles(join(entry, name), acc);
  }
  return acc;
}

describe("Kojo re-check 2 visa wording", () => {
  it("keeps banned journey claims and the 24h match-time metric out of every locale", () => {
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

  it("covers every shipped locale file", () => {
    const localeDir = join(process.cwd(), "src/i18n/locales");
    const files = readdirSync(localeDir).filter((name) => name.endsWith(".ts") && !name.includes(".test."));
    for (const file of files) {
      const key = file.replace(/\.ts$/, "");
      expect(LOCALES, `missing import for ${file}`).toHaveProperty(key);
    }
  });
});
