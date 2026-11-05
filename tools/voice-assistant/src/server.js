import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { chromium } from "playwright";
import { APPROVED_COMMANDS, routeUrl, requiresConfirmation } from "./config.js";
import { decideApprovedCommand } from "./jev.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.VOICE_ASSISTANT_PORT || 8787);
const profileDir = process.env.VOICE_ASSISTANT_PROFILE || path.resolve(__dirname, "../.profile");
const minConfidence = Number(process.env.JEV_MIN_CONFIDENCE || 0.55);
let context;
let page;
let pending = null;

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.resolve(__dirname, "../public")));

async function ensureBrowser() {
  if (page && !page.isClosed()) return page;
  context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: { width: 1440, height: 1000 },
  });
  page = context.pages()[0] || (await context.newPage());
  return page;
}

function safeCommand(key) {
  return key ? APPROVED_COMMANDS[key] || null : null;
}

async function executeKey(key, confirmed = false) {
  const command = safeCommand(key);
  if (!command) return { ok: false, status: "blocked", message: "Command is not approved." };
  if (requiresConfirmation(key) && !confirmed) {
    pending = key;
    return { ok: false, status: "confirmation_required", command: key, message: `Say confirm to continue with ${key}.` };
  }
  if (command.action.type !== "navigate") {
    return { ok: false, status: "blocked", command: key, message: "This sensitive action has no dedicated executor yet." };
  }
  const browserPage = await ensureBrowser();
  const url = routeUrl(key);
  await browserPage.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  return { ok: true, status: "executed", command: key, url: browserPage.url(), risk: command.risk };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "unidoxia-voice-assistant", jevConfigured: Boolean(process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY) });
});

app.post("/api/command", async (req, res) => {
  try {
    const transcript = String(req.body?.transcript || "").trim();
    const lower = transcript.toLowerCase();
    if (!transcript) return res.status(400).json({ ok: false, status: "blocked", message: "Empty command." });

    if (lower === "cancel" || lower === "never mind" || lower === "stop") {
      pending = null;
      return res.json({ ok: true, status: "cancelled" });
    }
    if (lower === "confirm" || lower === "yes confirm" || lower === "go ahead") {
      if (!pending) return res.json({ ok: false, status: "blocked", message: "Nothing is waiting for confirmation." });
      const key = pending;
      pending = null;
      return res.json(await executeKey(key, true));
    }

    const decision = await decideApprovedCommand(transcript);
    if (!decision.commandKey || decision.confidence < minConfidence) {
      return res.json({ ok: false, status: "blocked", message: "I could not match that safely to an approved command.", decision });
    }
    const result = await executeKey(decision.commandKey, false);
    res.json({ ...result, decision });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, status: "error", message: error.message || String(error) });
  }
});

app.listen(port, () => {
  console.log(`UniDoxia Voice Assistant: http://localhost:${port}`);
  console.log("Use Chrome or Edge for microphone recognition.");
});
