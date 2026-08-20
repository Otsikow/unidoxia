#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

const checkedAt = "2026-08-20T00:00:00Z";
const catalogueBase = "https://cat.georgiancollege.ca/programs";
const feesUrl = "https://www.georgiancollege.ca/international/finance-and-fees/";
const admissionsUrl = "https://www.georgiancollege.ca/international/admissions/";

const specs = [
  ["BTEC", "Biotechnology", "Ontario College Diploma", 24, "Barrie", "Natural and Applied Sciences", "Laboratory-based biotechnology training using current scientific equipment across microbiology, molecular biology, chemistry and pharmaceutical biotechnology.", true, [9]],
  ["CVET", "Civil Engineering Technician", "Ontario College Diploma, Co-op", 24, "Barrie", "Engineering and Technology", "Applied civil-engineering training in construction, surveying, materials, municipal services and infrastructure, with a co-op work term.", true, [9]],
  ["CVTY", "Civil Engineering Technology", "Ontario College Advanced Diploma, Co-op", 36, "Barrie", "Engineering and Technology", "Advanced applied learning in civil infrastructure, design, surveying, construction and project work, supported by two co-op work terms.", true, [9]],
  ["CMPG", "Computer Programming", "Ontario College Diploma, Co-op", 24, "Barrie", "Computing and Information Technology", "Hands-on software-development training covering programming, databases, web technologies and application development, with a co-op work term.", true, [9, 1]],
  ["CMPA", "Computer Programming and Analysis", "Ontario College Advanced Diploma, Co-op", 36, "Barrie", "Computing and Information Technology", "Advanced software analysis and development training with practical projects and two co-op work terms.", true, [9, 1]],
  ["CSTC", "Computer Systems Technician - Cloud Technologies", "Ontario College Diploma, Co-op", 24, "Barrie", "Computing and Information Technology", "Practical training in computer systems, networking, cloud platforms, security and technical support, with a co-op work term.", true, [9, 1]],
  ["CYTE", "Cybersecurity Technician", "Ontario College Diploma", 24, "Barrie Downtown", "Computing and Information Technology", "Applied cybersecurity training in systems, networks, threat analysis, defensive operations and secure computing environments.", false, [9]],
  ["EETN", "Electrical Engineering Technician", "Ontario College Diploma, Co-op", 24, "Barrie", "Engineering and Technology", "Hands-on electrical engineering training in circuits, controls, power systems, instrumentation and troubleshooting, with a co-op work term.", true, [9, 1]],
  ["EETY", "Electrical Engineering Technology", "Ontario College Advanced Diploma, Co-op", 36, "Barrie", "Engineering and Technology", "Advanced electrical engineering technology training in automation, power, controls and industrial systems, with three co-op work terms.", true, [9, 1]],
  ["METT", "Electromechanical Engineering Technician - Mechatronics", "Ontario College Diploma, Co-op", 24, "Barrie", "Engineering and Technology", "Integrated mechanical, electrical, automation and robotics training with practical laboratory work and a co-op term.", true, [9, 1]],
  ["METR", "Electromechanical Engineering Technology - Mechatronics", "Ontario College Advanced Diploma, Co-op", 36, "Barrie", "Engineering and Technology", "Advanced mechatronics training across robotics, automation, controls and integrated manufacturing systems, with three co-op terms.", true, [9, 1]],
  ["ENTN", "Environmental Technician", "Ontario College Diploma, Co-op", 24, "Barrie", "Environmental Sciences", "Field- and laboratory-based environmental training in sampling, monitoring, assessment and regulatory practice, with a co-op work term.", true, [9]],
  ["ENVR", "Environmental Technology", "Ontario College Advanced Diploma, Co-op", 36, "Barrie", "Environmental Sciences", "Advanced environmental field and laboratory training in assessment, monitoring, remediation and compliance, with three co-op work terms.", true, [9]],
  ["HRAC", "Heating, Refrigeration and Air Conditioning Technician", "Ontario College Diploma, Co-op", 24, "Barrie", "Skilled Trades", "Hands-on HVAC training in installation, service, controls, refrigeration and heating systems, with a co-op work term.", true, [9]],
  ["MTPT", "Mechanical Technician - Precision Tooling, Machining, and CNC", "Ontario College Diploma, Co-op", 24, "Barrie", "Skilled Trades", "Shop-based precision machining, tooling and CNC training using industry equipment, supported by a co-op work term.", true, [9]],
  ["METY", "Mechanical Engineering Technology", "Ontario College Advanced Diploma, Co-op", 36, "Barrie", "Engineering and Technology", "Advanced applied mechanical design, manufacturing, automation and engineering analysis, with three co-op work terms.", true, [9]],
  ["ARTC", "Architectural Technician", "Ontario College Diploma, Co-op", 24, "Barrie Downtown", "Architecture and Construction", "Applied architectural design, building technology, drafting and digital-modelling training with two co-op work terms.", true, [9]],
  ["ARTE", "Architectural Technology", "Ontario College Advanced Diploma, Co-op", 36, "Barrie Downtown", "Architecture and Construction", "Advanced architectural technology training in design development, building systems, codes and project documentation, with two co-op terms.", true, [9]],
  ["MTCY", "Marine Engineering Technology", "Ontario College Advanced Diploma, Co-op", 36, "Owen Sound", "Marine and Transportation", "Marine engineering training in vessel machinery, propulsion, electrical systems and shipboard operations, including two co-op work terms.", true, [9]],
  ["MNAV", "Marine Technology - Navigation", "Ontario College Advanced Diploma, Co-op", 36, "Owen Sound", "Marine and Transportation", "Practical navigation, seamanship, safety and vessel-operations training with three marine co-op work terms.", true, [9]],
  ["PETY", "Power Engineering Technology", "Ontario College Advanced Diploma, Co-op", 24, "Owen Sound", "Engineering and Technology", "Applied training in power generation, plant systems, operations and maintenance, with a co-op term and field placement.", true, [9]],
  ["VETN", "Veterinary Technician", "Ontario College Diploma", 24, "Barrie", "Health and Veterinary Sciences", "Hands-on animal-health training in clinical procedures, laboratory work, nursing care and diagnostics, including two field placements.", true, [9]],
  ["WETC", "Welding Techniques", "Ontario College Certificate", 12, "Midland or Owen Sound", "Skilled Trades", "Shop-based training in welding processes, fabrication, safety, blueprint reading and practical metalworking techniques.", false, [9]],
  ["PLTQ", "Plumbing Techniques", "Ontario College Certificate", 12, "Midland", "Skilled Trades", "Hands-on plumbing training in tools, piping systems, installation practices, codes and workplace safety.", false, [9]],
];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const programmes = specs.map(([code, title, qualification, durationMonths, campus, discipline, overview, placementAvailable, months]) => {
  const codeLower = code.toLowerCase();
  const officialUrl = `${catalogueBase}/${codeLower}/`;
  const requirements = [
    "Secondary-school graduation or equivalent",
    "Grade 12 English or equivalent",
    ...(discipline === "Engineering and Technology" || discipline === "Computing and Information Technology" || discipline === "Natural and Applied Sciences"
      ? ["Programme-specific mathematics and/or science prerequisites apply; confirm the official programme page"]
      : ["Programme-specific prerequisites and minimum grades apply; confirm the official programme page"]),
  ];
  return {
    title,
    slug: `${slugify(title)}-${codeLower}`,
    qualification,
    level: "Undergraduate",
    discipline,
    courseCode: code,
    officialUrl,
    durationMonths,
    studyMode: "Full-time",
    attendance: "On campus",
    campus,
    deliveryType: "In person",
    placementAvailable,
    overview,
    requirements,
    intakes: months.map((month) => ({ year: month === 1 ? 2028 : 2027, month, status: "provisional", applicationDeadline: null, sourceUrl: officialUrl })),
    tuition: { applicantType: "international", amount: null, currency: "CAD", feeYear: "2027/28", feeBasis: "annual", sourceUrl: feesUrl },
    applicationDetails: { routing: "guidance_only", dli: "O19395677361", intakeAvailabilityMustBeConfirmed: true, internationalAvailabilityMustBeConfirmed: true },
    englishRequirements: { ieltsAcademic: "6.0 general diploma or certificate minimum", toeflIbt: "79 general diploma or certificate minimum", pteAcademic: "58 general diploma or certificate minimum", sourceUrl: admissionsUrl, programmeExceptionsApply: true },
    catalogueStatus: "active",
    classification: "verified_fee_pending",
    sources: [
      { kind: "programme", url: officialUrl, priority: 1 },
      { kind: "english_requirements", url: admissionsUrl, priority: 1 },
    ],
  };
});

const dataset = {
  university: { name: "Georgian College", slug: "georgian-college", city: "Barrie", country: "Canada", website: "https://www.georgiancollege.ca/" },
  source: { url: `${catalogueBase}/`, label: "Official Georgian College 2027-28 Academic Catalogue" },
  academicYear: "2027/28",
  checkedAt,
  discovered: programmes.length,
  classified: programmes.length,
  programmes,
};

const output = new URL("../../data/catalogues/georgian-college-stem-expansion.json", import.meta.url);
await writeFile(output, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`Wrote ${output.pathname} with ${programmes.length} programmes.`);
