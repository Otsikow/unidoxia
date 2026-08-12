import { readFile, writeFile } from "node:fs/promises";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/catalogue/apply-reviewed-programme-replacements.mjs <dataset.json>");

const dataset = JSON.parse(await readFile(input, "utf8"));
const replacements = new Map([
  ["griffith-university::Bachelor of Advanced Government and International Tourism and Hotel Management (Honours) (1655) (106114J)", {
    name: "Bachelor of Nursing (1162) (002436M)",
    applyboardProgramReference: "https://www.applyboard.com/schools/griffith-university-nathan/programs/bachelor-of-nursing-1162-002436m-293628",
    tuitionAmount: null,
    earliestIntake: null,
  }],
  ["southeast-missouri-state-university::Bachelor of Science - Agribusiness - Animal Science", {
    name: "Bachelor of Science - Education - Agricultural Education",
    applyboardProgramReference: "https://www.applyboard.com/schools/southeast-missouri-state-university/programs/bachelor-of-science-education-agricultural-education",
    tuitionAmount: null,
    earliestIntake: null,
  }],
  ["southeast-missouri-state-university::Intensive English Program - Pathway program", {
    name: "Bachelor of Science - Professional Studies",
    applyboardProgramReference: "https://www.applyboard.com/schools/southeast-missouri-state-university/programs/bachelor-of-science-professional-studies-333500",
    tuitionAmount: null,
    currency: null,
    earliestIntake: null,
  }],
  ["university-of-north-alabama::Bachelor of Science/Arts - Communication Arts", {
    name: "Bachelor of Science/Arts - English",
    applyboardProgramReference: "https://www.applyboard.com/schools/university-of-north-alabama/programs/bachelor-of-science-arts-english",
    tuitionAmount: null,
    earliestIntake: null,
  }],
  ["university-of-europe-for-applied-sciences::Bachelor of Arts - Communication Design", {
    name: "Foundation Diploma & Bachelor of Arts - Illustration",
    applyboardProgramReference: "https://www.applyboard.com/schools/university-of-europe-for-applied-sciences-ue-berlin-f425/programs/foundation-diploma-bachelor-of-arts-illustration",
    tuitionAmount: null,
    earliestIntake: null,
  }],
]);

let applied = 0;
for (const institution of dataset.institutions) {
  if (institution.slug === "hochschule-fresenius") {
    institution.approvedOfficialHosts = ["amdnet.com"];
  }
  if (institution.slug === "university-of-north-alabama") {
    institution.approvedOfficialHosts = ["catalog.una.edu"];
  }
  for (const programme of institution.programmes) {
    const replacement = replacements.get(`${institution.slug}::${programme.name}`);
    if (!replacement) continue;
    Object.assign(programme, replacement, {
      applyboardProgramVerifiedAt: "2026-08-12T00:00:00Z",
      officialProgrammeUrl: null,
      officialProgrammeVerificationStatus: "pending_exact_official_source",
      officialProgrammeVerifiedAt: null,
      officialSourceMatch: null,
      officialSourceCandidates: [],
      officialEvidence: null,
      tuitionComparison: null,
      lastVerifiedAt: "2026-08-12T00:00:00Z",
    });
    applied += 1;
  }
}

dataset.reviewedProgrammeReplacements = {
  appliedAt: "2026-08-12T00:00:00Z",
  count: applied,
  reason: "Replaced stale, renamed, transitioning, or closed listings with current programmes from the same institution that have exact ApplyBoard and official-university references.",
};
await writeFile(input, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ applied }, null, 2));
