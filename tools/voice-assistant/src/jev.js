import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { APPROVED_COMMANDS } from "./config.js";

const MODEL = process.env.JEV_MODEL || "jev-1.13.0";
let client;

function getClient() {
  if (client) return client;
  const apiKey = process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY;
  if (!apiKey) throw new Error("Missing TYPESAFE_API_KEY or JEV_API_KEY");
  client = new TypeSafeClient({ apiKey, defaultModel: MODEL, timeout: 8000, retry: { maxRetries: 1 } });
  return client;
}

export function commandCriteria() {
  const criteria = {};
  for (const [key, command] of Object.entries(APPROVED_COMMANDS)) {
    criteria[key] = {
      what: `The user wants the approved UniDoxia command ${key}`,
      examples: command.phrases,
    };
  }
  criteria.none = {
    what: "The request does not clearly match an approved UniDoxia command",
    examples: ["do something", "change everything", "buy this", "open my bank"],
  };
  return criteria;
}

export async function decideApprovedCommand(transcript) {
  const text = String(transcript || "").trim();
  if (!text) return { commandKey: null, confidence: 0, model: MODEL };

  const questions = {
    command: choice(
      {
        question: "Which approved UniDoxia command best matches `transcript`?",
        focus: "Choose only from the supplied command keys. Pick none if the request is ambiguous or outside the approved list.",
      },
      commandCriteria(),
    ),
  };

  const { data } = await getClient().systemOne({ state: { transcript: text }, questions, model: MODEL }).withResponse();
  const answer = data.answers?.command;
  const commandKey = answer?.choice && answer.choice !== "none" ? answer.choice : null;
  const confidence = Number(answer?.confidence ?? answer?.probability ?? answer?.p ?? 0);
  return { commandKey, confidence, model: data.model || MODEL };
}
