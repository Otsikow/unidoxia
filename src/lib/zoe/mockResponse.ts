interface ZoeTemplate {
  key: string;
  title: string;
  scope: string;
  highlights: string[];
  blockers: string[];
  actions: string[];
}

const ZOE_TEMPLATES: Record<string, ZoeTemplate> = {
  messages: {
    key: "messages",
    title: "Message center",
    scope:
      "Agent ↔ student chats, staff escalations, and university announcements in the last 24 hours",
    highlights: [
      "**Agent Riley ↔ Zoe Chen** – faculty interview rehearsal is booked for Thursday 4:30 PM PT and Riley already uploaded annotated SOP feedback.",
      "**Finance + Support** – tuition deposit remains pending; finance expects Zoe's transfer confirmation tonight and is ready to issue CAS once it lands.",
      "**Cascadia University channel** – admissions expanded Spring 2025 STEM seats by 15% and asked Bridge to prioritise CS/Data Science candidates.",
    ],
    blockers: [
      "Deposit receipt is the only blocker for Zoe Chen's CAS issuance.",
      "Updated admissions rubric needs to be circulated internally once Maya finalises it.",
    ],
    actions: [
      "Send Zoe a quick reminder after 6 pm local time if the transfer confirmation still hasn't arrived.",
      "Share the revised rubric with Agent Riley and set expectations for the Cascadia STEM target list.",
      "Log Thursday's mock interview outcome so the faculty panel sees preparation status before their call.",
    ],
  },
  partners: {
    key: "partners",
    title: "Partner health",
    scope:
      "Partner escalations, onboarding status, and performance KPIs pulled from synced dashboards",
    highlights: [
      "NorthStar Pathways is pacing at 118% of their monthly offer target with conversion strength in postgraduate STEM.",
      "Atlas Recruiters submitted six new CAS-ready dossiers but needs faster SOP coaching to maintain velocity.",
      "Bridge internal response SLAs are green — median reply time to partner escalations is 14 minutes.",
    ],
    blockers: [
      "Atlas is still missing faculty interview prep collateral and is escalating for help.",
      "Two partners flagged duplicate application IDs after yesterday's CRM import and are waiting on confirmation.",
    ],
    actions: [
      "Publish a quick Loom summarising the SOP tips shared with Zoe; re-use it across agents asking similar questions.",
      "Confirm the CRM import fix before EOD and broadcast resolution notes to partner success leads.",
      "Offer Atlas a drop-in coaching session so their CAS-ready cases do not stall at the interview stage.",
    ],
  },
  admissions: {
    key: "admissions",
    title: "Admissions pulse",
    scope: "Application funnel for the current tenant with focus on ready-to-offer students",
    highlights: [
      "Four students are documents-complete and only waiting on tuition deposit confirmation (including Zoe Chen).",
      "Interview readiness increased week-over-week after agents adopted the new prep checklist.",
    ],
    blockers: [
      "Deposit confirmations and financial guarantees remain the #1 blocker for offer issuance.",
      "Scholarship FAQ page is outdated and is causing repeated agent questions in chat.",
    ],
    actions: [
      "Queue finance follow-ups for any deposit older than 48h with no receipt uploaded.",
      "Refresh scholarship FAQ copy and pin it in the agent announcement channel.",
      "Send a congratulatory nudge to students who cleared interviews to keep them warm before offers go out.",
    ],
  },
};

const DEFAULT_TEMPLATE = ZOE_TEMPLATES.messages;

export interface ZoeMockRequest {
  prompt: string;
  context?: Record<string, unknown>;
  surface?: string;
  audience?: string | null;
}

export interface ZoeMockResponse {
  markdown: string;
  metadata: Record<string, unknown>;
}

const selectTemplate = (contextFocus?: unknown): ZoeTemplate => {
  if (typeof contextFocus !== "string") {
    return DEFAULT_TEMPLATE;
  }

  const normalized = contextFocus.trim().toLowerCase();
  return ZOE_TEMPLATES[normalized] ?? DEFAULT_TEMPLATE;
};

const formatSection = (heading: string, items: string[]) => {
  if (!items.length) return "";
  const body = items.map((item) => `- ${item}`).join("\n");
  return `### ${heading}\n${body}`;
};

export const generateZoeMockResponse = ({
  prompt,
  context,
  surface,
  audience,
}: ZoeMockRequest): ZoeMockResponse => {
  const focusFromContext = context?.focus ?? context?.topic ?? context?.surface;
  const template = selectTemplate(focusFromContext);
  const interpretedPrompt = prompt?.trim().length ? prompt.trim() : "Latest messaging insights";

  const sections: string[] = [
    `**Prompt interpreted:** ${interpretedPrompt}`,
    `**Signals reviewed:** ${template.scope}`,
    formatSection("Highlights", template.highlights),
    formatSection("Blockers", template.blockers),
    formatSection("Recommended next steps", template.actions),
    `_Responding with seeded demo insights while the live Zoe Edge Function is unavailable in this environment._`,
  ].filter(Boolean);

  return {
    markdown: sections.join("\n\n"),
    metadata: {
      mode: "mock",
      focus: template.key,
      surface: surface ?? context?.surface ?? null,
      audience: audience ?? context?.audience ?? null,
    },
  } satisfies ZoeMockResponse;
};

const chunkMarkdown = (markdown: string, chunkSize = 320): string[] => {
  const normalized = markdown.trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\n+/);
  const chunks: string[] = [];
  let buffer = "";

  paragraphs.forEach((paragraph) => {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > chunkSize && buffer) {
      chunks.push(buffer);
      buffer = paragraph;
      return;
    }
    if (candidate.length > chunkSize) {
      let start = 0;
      while (start < paragraph.length) {
        const slice = paragraph.slice(start, start + chunkSize);
        chunks.push(slice);
        start += chunkSize;
      }
      buffer = "";
      return;
    }
    buffer = candidate;
  });

  if (buffer.trim().length) {
    chunks.push(buffer);
  }

  return chunks;
};

export const generateZoeMockChunks = (
  request: ZoeMockRequest,
  chunkSize?: number,
): { markdown: string; metadata: Record<string, unknown>; chunks: string[] } => {
  const response = generateZoeMockResponse(request);
  return {
    ...response,
    chunks: chunkMarkdown(response.markdown, chunkSize),
  };
};

