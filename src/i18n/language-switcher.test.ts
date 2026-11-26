import { describe, expect, it } from "vitest";
import { languageList } from "@/i18n/resources";

// Locales shipped as files but kept out of the switcher until a native speaker has
// checked their legal and visa wording (Kojo, 23 Nov 2026).
const NEEDS_NATIVE_CHECK = ["sw", "hi", "zh", "ar"] as const;

// Record a completed check here (who, date, file reference) before adding the
// language to languageList, e.g. sw: "Native check by <name>, <date>, <ref>".
const NATIVE_SPEAKER_CHECKS: Partial<Record<(typeof NEEDS_NATIVE_CHECK)[number], string>> = {};

describe("language switcher", () => {
  it("keeps sw, hi, zh and ar out until a native-speaker check is recorded", () => {
    for (const code of NEEDS_NATIVE_CHECK) {
      if (NATIVE_SPEAKER_CHECKS[code]) continue;
      expect(languageList as readonly string[], `${code} needs a recorded native check`).not.toContain(code);
    }
  });
});
