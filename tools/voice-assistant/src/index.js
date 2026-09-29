import { chromium } from "playwright";
import { APPROVED_COMMANDS, RISK, routeUrl, requiresConfirmation } from "./config.js";

function normalise(text) {
  return String(text || "").trim().toLowerCase();
}

export function matchApprovedCommand(text) {
  const spoken = normalise(text);
  if (!spoken) return null;

  for (const [key, command] of Object.entries(APPROVED_COMMANDS)) {
    if (command.phrases.some((phrase) => spoken === phrase || spoken.includes(phrase))) {
      return { key, ...command };
    }
  }
  return null;
}

export async function executeApprovedCommand(text, { confirmed = false, page } = {}) {
  const command = matchApprovedCommand(text);
  if (!command) return { ok: false, status: "blocked", message: "Command is not on the approved list." };

  if (requiresConfirmation(command.key) && !confirmed) {
    return {
      ok: false,
      status: "confirmation_required",
      command: command.key,
      message: `Confirmation required before ${command.key}.`,
    };
  }

  if (command.action.type === "navigate") {
    const url = routeUrl(command.key);
    if (!page) return { ok: true, status: "planned", command: command.key, url, risk: command.risk };
    await page.goto(url, { waitUntil: "domcontentloaded" });
    return { ok: true, status: "executed", command: command.key, url: page.url(), risk: command.risk };
  }

  if (command.risk === RISK.RED) {
    return { ok: false, status: "blocked", message: "Destructive execution must be implemented as an explicit per-action handler." };
  }

  return { ok: true, status: "planned", command: command.key, risk: command.risk };
}

async function main() {
  const spoken = process.argv.slice(2).join(" ");
  if (!spoken) {
    console.log("Usage: npm start -- \"show applications\"");
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const result = await executeApprovedCommand(spoken, { page });
  console.log(result);

  if (!result.ok) await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
