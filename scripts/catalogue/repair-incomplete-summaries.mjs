import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/catalogues");
const badEnding = /(?:,|\b(?:and|or|the|a|an|to|of|for|with|in|on|at|from))$/i;

export const repairIncompleteSummary = (value) => {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text || !badEnding.test(text)) return text;
  const complete = text.match(/.*[.!?](?=\s|$)/s)?.[0]?.trim();
  return complete && complete.length >= 20 ? complete : null;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let audited = 0;
  let repaired = 0;
  let unresolved = 0;
  for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith("-reviewed.json"))) {
    const fullPath = path.join(directory, filename);
    // Start from the reviewed Git dataset so repeat runs are deterministic.
    const dataset = JSON.parse(execFileSync("git", ["show", `HEAD:data/catalogues/${filename}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
    for (const programme of dataset.programmes || []) {
      audited += 1;
      const repairedSummary = repairIncompleteSummary(programme.overview);
      if (repairedSummary === programme.overview) continue;
      if (repairedSummary) {
        programme.overview = repairedSummary;
        repaired += 1;
      } else {
        programme.overview = null;
        unresolved += 1;
      }
    }
    fs.writeFileSync(fullPath, `${JSON.stringify(dataset, null, 2)}\n`);
  }
  console.log(JSON.stringify({ audited, repaired, unresolved }));
}
