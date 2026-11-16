/** Fixed Zoe reply for any visa or immigration question. Do not paraphrase. */
export const ZOE_VISA_REFUSAL_REPLY =
  "I can't give advice about your own visa. Please check the official government website (for the UK: https://www.gov.uk/student-visa), your university's international student team, or a regulated immigration adviser (in the UK: https://www.gov.uk/find-an-immigration-adviser). I'm happy to help with choosing and applying to universities.";

const VISA_OR_IMMIGRATION_TERM =
  /\b(visas?|visum|vistos?|visados?|viza|immigration|entry clearance|study permit|work permit|residence permit|biometrics?|indefinite leave|leave to remain|leave to enter|dependants?|dependent visa|spouse visa|student visa|titre de s[ée]jour|permis d['’][ée]tudes|f-?1|tier\s*4)\b/i;

const VISA_OR_IMMIGRATION_NON_LATIN = /签证|簽證|تأشيرة|वीज़ा|वीजा/;

const DEPENDANT_TRAVEL =
  /\b((my|our)\s+)?(wife|husband|spouse|partner|children|child|kids|son|daughter|dependants?|dependents?)\b[\s\S]{0,60}\b(come with|comes with|accompany|join me|come along|come too|travel with)\b/i;

const BRING_DEPENDANT =
  /\b(bring|sponsor|include)\b[\s\S]{0,60}\b(wife|husband|spouse|partner|child|children|kids|son|daughter|dependants?|dependents?)\b/i;

export function isVisaOrImmigrationQuestion(text: string): boolean {
  const value = (text ?? "").trim();
  if (!value) return false;
  return (
    VISA_OR_IMMIGRATION_TERM.test(value) ||
    VISA_OR_IMMIGRATION_NON_LATIN.test(value) ||
    DEPENDANT_TRAVEL.test(value) ||
    BRING_DEPENDANT.test(value)
  );
}

export function visaScopeReply(text: string): string | null {
  return isVisaOrImmigrationQuestion(text) ? ZOE_VISA_REFUSAL_REPLY : null;
}

export function isVisaKnowledgeItem(match: Record<string, unknown> | null | undefined): boolean {
  if (!match) return false;
  const tags = Array.isArray(match.tags) ? (match.tags as unknown[]).join(" ") : String(match.tags ?? "");
  const blob = [match.category, match.title, tags, match.content, match.source_type]
    .map((part) => String(part ?? "").toLowerCase())
    .join(" ");
  return /\bvisa\b|\bvisas\b|\bimmigration\b|study permit|entry clearance|work permit/.test(blob);
}
