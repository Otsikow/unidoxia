import { describe, expect, it } from "vitest";
import {
  ZOE_VISA_REFUSAL_REPLY,
  isVisaKnowledgeItem,
  isVisaOrImmigrationQuestion,
  visaScopeReply,
} from "./zoeVisaScope";

const VISA_PROMPTS = [
  "Am I eligible for a UK student visa with £10,000?",
  "My visa was refused, what should I do?",
  "Can my wife come with me?",
  "What are my chances of getting a Canada study permit with IELTS 6.0?",
  "Should I appeal my US F-1 refusal?",
  "Do I have enough money in my bank account for a student visa?",
];

const NOT_VISA_PROMPTS = [
  "What A-level grades does the University of Manchester usually ask for?",
  "Which computer science courses in Canada have September intakes?",
];

const ASSESSMENT_LEAK =
  /\b(you are eligible|you are likely|you should appeal|success rate|probability band|I recommend applying|you will be granted)\b/i;

describe("Zoe visa scope", () => {
  it("returns the fixed refusal for visa and immigration prompts and does not assess them", () => {
    expect(VISA_PROMPTS.length).toBeGreaterThanOrEqual(5);
    for (const prompt of VISA_PROMPTS) {
      const reply = visaScopeReply(prompt);
      expect(reply, prompt).toBe(ZOE_VISA_REFUSAL_REPLY);
      expect(reply).toContain("I can't give advice about your own visa.");
      expect(reply).not.toMatch(ASSESSMENT_LEAK);
    }
  });

  it("does not refuse ordinary university or course questions", () => {
    for (const prompt of NOT_VISA_PROMPTS) {
      expect(isVisaOrImmigrationQuestion(prompt), prompt).toBe(false);
      expect(visaScopeReply(prompt)).toBeNull();
    }
  });

  it("filters visa-requirement knowledge so it is not injected into Zoe", () => {
    expect(
      isVisaKnowledgeItem({
        category: "visa-requirements",
        title: "UK Student visa documents",
        content: "Bank balance and CAS steps",
      }),
    ).toBe(true);
    expect(
      isVisaKnowledgeItem({
        category: "admissions",
        title: "Computer Science entry requirements",
        content: "A-level Mathematics and a personal statement",
      }),
    ).toBe(false);
  });
});
