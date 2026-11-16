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
  "Full guidance from application to visa",
  "Visa preparation assistance",
  "95% visa success rate",
  "comprehensive visa support",
  "comprehensive visa guidance",
  "Visa Guidance",
  "Visa friendly",
  "Stay on track with visa support",
  "Get personalized checklists and step-by-step visa guidance.",
  "Visa guidance, simplified",
  "Navigate Visa Requirements Easily",
  "Visa-ready support for UK, USA, Canada, Germany, Ireland, and Australia",
  "Organized visa documentation in one place",
  "Add the student's current country to tailor university and visa guidance.",
  "Visa success by nationality",
  "Visa preparation timeline",
  "Provide ONLY basic, publicly available visa information",
  "Links to official visa information for high-demand technology and engineering roles",
  "Visa-Leitfäden für gefragte Technik- und Ingenieurberufe",
  "Conseils visa pour les métiers technologiques et d'ingénierie les plus demandés",
  "Orientación de visado para profesiones tecnológicas e ingenieriles en alta demanda",
  "针对热门科技与工程岗位的签证指导",
  "Our AI engine analyses admissions insights, scholarships, and visa pathways",
  "tailored AI recommendations across admissions, scholarships, and visas",
  "在申请前先评估您的签证通过率",
  "AI Visa Success Predictor",
  "Visa Application Guidance",
  "Confirm your visa-readiness steps",
  "Complete Visa Application Guide for Canada",
  "Visa Eligibility Assessment",
  "Visa Eligibility",
  "delay a student's visa or offer",
  "Visa considerations for paid placements and work terms",
  "getVisaEligibility",
  "comprehensive visa",
  "umfassende Visa",
  "accompagnement visa",
  "completa de visto",
  "completo de visto",
  "Visa checklists",
  "who will guide you through document review, applications, offer letters, and visa preparation",
  "from course selection to visa approval",
  "visa preparation resources",
  "Visa interview reminder",
  "Visa interview prep checklist",
  "Delivers embassy checklist guidance",
  "Study gap too long for visa approval",
  "Long study gap—justify with work or certifications",
  "Age close to upper limit—visa risk",
  "Schedule visa counseling session",
  "Visa counselling backlog cleared — response times dropped from 3 days to under 12 hours.",
  "Multiple previous visa refusals",
  "Prior visa refusal—requires strong SOP and evidence",
  "Meets minimum program and visa checks",
  "previous_visa_refusals",
  "From choosing the right university to submitting your application, securing your offer, and preparing for your student visa, UniDoxia supports you every step of the way until you are ready to travel.",
  "Receive personalized guidance every step of the way.",
  "We respond within 24 hours.",
  "Priority response times (24-48 hours)",
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

  it("does not keep the 95% visa-success metric in any locale", () => {
    for (const [name, locale] of Object.entries(LOCALES)) {
      const blob = JSON.stringify(locale);
      expect(blob, name).not.toMatch(
        /Visa-Erfolgsquote|taux de réussite visa|taxa de sucesso de visto|visa success rate/,
      );
      expect(blob, name).not.toMatch(/"95%"/);
    }
  });

  it("covers every shipped locale file", () => {
    const localeDir = join(process.cwd(), "src/i18n/locales");
    const files = readdirSync(localeDir).filter((name) => name.endsWith(".ts") && !name.includes(".test."));
    for (const file of files) {
      const key = file.replace(/\.ts$/, "");
      expect(LOCALES, `missing import for ${file}`).toHaveProperty(key);
    }
  });

  it("keeps the unused recommendations visa tab and eligibility helper out of the tree", () => {
    const rec = readFileSync(join(process.cwd(), "src/components/ai/ProgramRecommendations.tsx"), "utf8");
    const hook = readFileSync(join(process.cwd(), "src/hooks/useAIRecommendations.tsx"), "utf8");
    expect(rec).not.toMatch(/Visa Eligibility|getVisaEligibility|estimated visa eligibility/);
    expect(hook).not.toMatch(/getVisaEligibility/);
  });

  it("does not keep a 24h average-match-time metric in any locale", () => {
    const phrases = [
      "24h",
      "average match time",
      "durchschnittliche Matching-Zeit",
      "délai moyen de matching",
      "tempo médio de matching",
    ];
    for (const [name, locale] of Object.entries(LOCALES)) {
      const blob = JSON.stringify(locale);
      for (const phrase of phrases) {
        expect(blob, `${name}: ${phrase}`).not.toContain(phrase);
      }
    }
  });
});
