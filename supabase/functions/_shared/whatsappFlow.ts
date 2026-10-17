export interface FlowState {
  introduced?: boolean;
  step?: 'subject' | 'level' | 'country';
  subject?: string;
  level?: string;
  unknown?: number;
}
export interface Course { id: string; name: string; level: string; university: string; country: string }
export interface ApplicationStatus { university: string; programme: string; status: string; changedAt: string | null }
export interface OpeningHours { days: number[]; open: string; close: string }
export const LINK_FAILURE = "Sorry, we couldn't link this number.\nPlease sign in to your UniDoxia dashboard, check the WhatsApp number saved in your profile and get a new code.";
export const WELCOME = 'Hello, welcome to UniDoxia.';
export const MENU = 'How can we help?\n1 Find courses\n2 Study destinations\n3 My application status\n4 Speak to the admissions team';
export const DISCLOSURE = "You're chatting with our automated assistant. Type 4 at any time to speak to the admissions team.\nPlease don't send passport numbers, card details, passwords or documents here. Privacy: https://unidoxia.com/legal/privacy";
export const HANDOVER = "Thanks. I've passed this to the UniDoxia admissions team. Someone will reply here as soon as they can.";
export function parseOpeningHours(raw?: string): OpeningHours | undefined {
  try {
    const v = JSON.parse(raw ?? 'null');
    const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (v && Array.isArray(v.days) && v.days.length && v.days.every((d: number) => Number.isInteger(d) && d >= 1 && d <= 6) && time.test(v.open) && time.test(v.close) && v.open < v.close) return { days: v.days, open: v.open, close: v.close };
  } catch { /* Unknown hours must not imply a schedule. */ }
  return undefined;
}
const londonClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function isOpen(now: Date, hours: OpeningHours): boolean {
  const parts = londonClock.formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(part('weekday'));
  const time = `${part('hour')}:${part('minute')}`;
  return hours.days.includes(day) && time >= hours.open && time < hours.close;
}
export function optCommand(text: string): 'in' | 'out' | undefined {
  const clean = text.replace(/[^\p{L}\p{N}\s]/gu, '').trim().replace(/\s+/g, ' ');
  if (/^(stop|stop all|stop messages|unsubscribe|opt out|optout|cancel messages)\b/i.test(clean)) return 'out';
  if (/^(start|unstop|opt in)\b/i.test(clean)) return 'in';
}
export const isOptCommand = (text: string) => optCommand(text) !== undefined;
export const VISA_REPLY = "We can't give visa or immigration advice, and we can't guarantee an offer, visa or scholarship. Universities and the Home Office make those decisions.\nFor official visa guidance, see https://www.gov.uk/student-visa\nType 4 if you'd like the admissions team to help with your application.";
export const ZOE_ESCALATION = 'Please speak to the UniDoxia admissions team about this. Contact info@unidoxia.com or continue on WhatsApp.';
export const showZoeHandoff = (messages: { role: string; content: string }[]) => messages.slice(-3).some(m => m.role === 'user' ? needsPerson(m.content) : m.role === 'assistant' && m.content.includes(ZOE_ESCALATION));
export const zoeReference = (text: string) => text.match(/\bRef\s+ZOE-([a-f0-9]{8,32})\b/i)?.[1]?.toLowerCase();
export function needsPerson(text: string): boolean {
  return /\b(adviser|advisor|agent|human|person|someone|manager|complain\w*|call me|speak to|visa refus\w*|refund|legal)\b/i.test(text) || /visa.{0,30}(refus|reject|denied)|refus.{0,30}visa|eligibility\s+disput|lawyer|solicitor/i.test(text);
}
export function handoverReply(now = new Date(), hours?: OpeningHours): string {
  if (!hours || isOpen(now, hours)) return HANDOVER;
  // Search actual instants, so London daylight saving changes need no offset assumptions.
  for (let minute = 1; minute <= 8 * 24 * 60; minute++) {
    const next = new Date(now.getTime() + minute * 60000);
    if (!isOpen(next, hours)) continue;
    const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' }).format(next);
    const [hour, minutes] = hours.open.split(':').map(Number);
    const time = `${hour % 12 || 12}${minutes ? ':' + String(minutes).padStart(2, '0') : ''}${hour < 12 ? 'am' : 'pm'}`;
    return `Thanks. I've passed this to the UniDoxia admissions team. We're closed now, so we'll reply on ${date} from ${time} UK time.`;
  }
  return HANDOVER;
}
export interface FlowInput {
  text: string | null; state?: FlowState; optedOut?: boolean; linked?: boolean; mode?: 'assistant' | 'human' | 'closed';
  now?: Date; hours?: OpeningHours;
  courses?: Course[]; countries?: string[]; applications?: ApplicationStatus[]; linkResult?: boolean;
}
export interface FlowResult {
  replies: string[]; state: FlowState; handover?: string; zoeRef?: string;
  consent?: 'in' | 'out'; linkCode?: string;
  lookup?: { type: 'courses'; subject: string; level: string; country?: string } | { type: 'countries' | 'status' };
}
const STATUS: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', screening: 'Screening', conditional_offer: 'Conditional offer',
  unconditional_offer: 'Unconditional offer', cas_loa: 'CAS or letter of acceptance', visa: 'Visa stage',
  enrolled: 'Enrolled', withdrawn: 'Withdrawn', deferred: 'Deferred', rejected: 'Not successful',
  under_review: 'Under review', pending_documents: 'Documents pending', interview_scheduled: 'Interview scheduled', interview: 'Interview',
};
export function runWhatsAppFlow(input: FlowInput): FlowResult {
  const { text, optedOut, linked } = input;
  const state = { ...input.state };
  const result: FlowResult = { replies: [], state };
  const say = (body: string) => {
    if (!state.introduced) result.replies.push(WELCOME + '\n' + DISCLOSURE);
    result.replies.push(body);
    state.introduced = true;
    return result;
  };
  const handover = (reason: string) => {
    result.handover = reason; state.step = undefined; state.unknown = 0;
    return say((/visa.{0,30}(refus|reject|denied)|refus.{0,30}visa/i.test(text ?? '') ? "We can't give immigration advice, but the admissions team can help with your university application.\n" : '') + handoverReply(input.now, input.hours));
  };
  const trimmed = text?.trim() ?? '';
  if (optCommand(trimmed) === 'out') {
    if (optedOut) return result;
    result.consent = 'out'; state.step = undefined;
    result.replies.push("You've opted out. We won't send you any more WhatsApp messages. Send START if you change your mind.");
    state.introduced = true;
    return result;
  }
  if (optCommand(trimmed) === 'in') {
    result.consent = 'in'; state.step = undefined; state.unknown = 0;
    return say("Thanks, you've opted back in." + (input.mode === 'human' ? '\nThe UniDoxia admissions team will reply here.' : '\n' + MENU));
  }
  if (optedOut) return result;
  if (text === null) {
    say("Sorry, I can't open files, photos or voice notes here.\nPlease upload documents in your UniDoxia dashboard: https://unidoxia.com/student/documents");
    handover('Non-text message');
    result.replies = [result.replies.join('\n')];
    return result;
  }
  const ref = zoeReference(trimmed);
  if (ref) { result.zoeRef = ref; return handover('Zoe handover'); }
  if (trimmed === '4' || needsPerson(trimmed)) return handover('Student requested admissions support');
  if (/^link\s*\d/i.test(trimmed)) {
    if (!/^link\s+\d{6}$/i.test(trimmed)) return say(LINK_FAILURE);
    if (input.linkResult === undefined) { result.linkCode = trimmed.slice(-6); return result; }
    return say(input.linkResult ? "Thanks, your WhatsApp number is now linked to your UniDoxia account.\nReply 3 to see your application status.\nThis doesn't sign you up for updates. You can turn those on in your profile settings." : LINK_FAILURE);
  }
  if ((state.step !== 'subject' || /guarant/i.test(trimmed) || /\bvisa\b/i.test(trimmed)) && (/\b(visa|immigration|brp|evisa)\b/i.test(trimmed) || /guarant/i.test(trimmed))) { state.unknown = 0; return say(VISA_REPLY); }
  const plain = trimmed.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (/^(hi|hello|hey|hiya|good (morning|afternoon|evening)|menu|help)\b/i.test(plain) || !trimmed) {
    state.step = undefined; state.unknown = 0;
    return say(state.introduced ? WELCOME + '\n' + MENU : MENU);
  }
  if (trimmed === '1' || /^courses$/i.test(trimmed)) { state.step = 'subject'; state.unknown = 0; return say("What would you like to study? For example, nursing or computer science."); }
  if (trimmed === '2') {
    state.step = undefined; state.unknown = 0;
    if (input.countries === undefined) { result.lookup = { type: 'countries' }; return result; }
    return say(input.countries.length ? `We have universities in:\n${[...new Set(input.countries)].sort().join('\n')}\nSee all courses: https://unidoxia.com/courses` : "Sorry, I can't show destinations right now. Reply 4 for the admissions team.");
  }
  if (trimmed === '3' || /^status$/i.test(trimmed)) {
    state.step = undefined; state.unknown = 0;
    if (!linked) return say("To keep your details private, please link your account first.\nSign in at https://unidoxia.com/student/profile and choose \"Link WhatsApp to your account\" to get a code.\nThen send LINK and the code from the number saved in your profile.");
    if (input.applications === undefined) { result.lookup = { type: 'status' }; return result; }
    return say(input.applications.length ? "Here's the latest on your applications:\n\n" + input.applications.map(a => `${a.university}\n${a.programme}\n${STATUS[a.status] ?? 'Please check your dashboard'}\nLast updated: ${a.changedAt && Number.isFinite(Date.parse(a.changedAt)) ? new Date(a.changedAt).toLocaleDateString('en-GB', { timeZone: 'Europe/London' }) : 'date unavailable'}`).join('\n\n') + '\n\nFor full details, sign in at https://unidoxia.com/student/applications' : "I can't see any applications on this account. Check your dashboard at https://unidoxia.com/student/applications or reply 4 for the admissions team.");
  }
  if (state.step === 'subject') {
    state.subject = trimmed.slice(0, 100); state.step = 'level'; state.unknown = 0;
    return say("Which level?\nA Undergraduate\nB Postgraduate (Masters)\nC Foundation\nD Diploma or certificate\nE PhD");
  }
  if (state.step === 'level') {
    const levels: Record<string,string> = { a: 'undergraduate', b: 'postgraduate', c: 'foundation', d: 'diploma', e: 'doctorate', undergraduate: 'undergraduate', bachelor: 'undergraduate', postgraduate: 'postgraduate', master: 'postgraduate', foundation: 'foundation', diploma: 'diploma', doctorate: 'doctorate', phd: 'doctorate' };
    Object.assign(levels, { masters: 'postgraduate', msc: 'postgraduate', ma: 'postgraduate', mba: 'postgraduate', bsc: 'undergraduate', ba: 'undergraduate', degree: 'undergraduate', certificate: 'diploma' });
    const level = levels[trimmed.toLowerCase()];
    if (level) { state.level = level; state.step = 'country'; state.unknown = 0; return say("Which country would you like to study in? Reply ANY to see all countries."); }
    return say('Please reply A, B, C, D or E.');
  }
  if (state.step === 'country') {
    if (input.courses === undefined) {
      result.lookup = { type: 'courses', subject: state.subject ?? '', level: state.level ?? '', country: /^(any|skip)$/i.test(trimmed) ? undefined : trimmed.slice(0, 80) };
      return result;
    }
    state.step = undefined; state.unknown = 0;
    return say(input.courses.length ? `Here are some courses that match:\n\n${input.courses.slice(0, 5).map(c => `${c.name}\n${c.university}, ${c.country}\n${c.level}\nhttps://unidoxia.com/courses/${encodeURIComponent(c.id)}`).join('\n\n')}\n\nReply 1 to search again or 4 for the admissions team.` : "Sorry, I couldn't find a match. Reply 1 to try another subject, or 4 for the admissions team.");
  }
  if (!state.introduced) return say(MENU);
  state.unknown = (state.unknown ?? 0) + 1;
  if (state.unknown >= 2) return handover('Two messages not understood');
  return say("Sorry, I didn't understand. Please reply 1, 2, 3 or 4, or type menu.");
}
