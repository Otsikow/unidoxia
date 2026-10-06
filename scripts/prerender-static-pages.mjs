// Post-build: write dist/<route>/index.html for public pages so the raw HTML
// (before JavaScript) carries each page's own title, description, canonical,
// og:* tags and crawlable starter content. React replaces #root on load.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ORIGIN = "https://unidoxia.com";
const DIST = path.resolve("dist");
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const readEnv = () => {
  const env = { ...process.env };
  try {
    for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^(\w+)=["']?(.*?)["']?$/);
      if (m && !env[m[1]]) env[m[1]] = m[2];
    }
  } catch {}
  return env;
};
const env = readEnv();
const SB_URL = env.VITE_SUPABASE_URL;
const SB_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const rest = async (query) => {
  if (!SB_URL || !SB_KEY) return [];
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${query}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
};

let faqSections = [];
try {
  const en = (await import(pathToFileURL(path.resolve("src/i18n/locales/en.ts")).href)).default;
  faqSections = en?.pages?.faq?.sections ?? [];
} catch (e) {
  console.warn("[prerender] FAQ text unavailable:", e.message);
}

const featured = await rest(
  "universities?select=name,slug,city,country,featured_summary&featured=eq.true&active=eq.true&order=featured_priority.asc.nullslast&limit=12",
);
const posts = await rest(
  "blog_posts?select=slug,title,seo_title,seo_description,excerpt&status=eq.published&order=published_at.desc&limit=500",
);

const faqHtml = faqSections
  .map(
    (s) =>
      `<section><h2>${esc(s.audience)}</h2>${(s.items || [])
        .map((i) => `<h3>${esc(i.question)}</h3><p>${esc(i.answer)}</p>`)
        .join("")}</section>`,
  )
  .join("");

const faqJsonLd = faqSections.length
  ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqSections.flatMap((s) =>
        (s.items || []).map((i) => ({
          "@type": "Question",
          name: i.question,
          acceptedAnswer: { "@type": "Answer", text: i.answer },
        })),
      ),
    }
  : null;

const featuredHtml = featured.length
  ? `<section><h2>Featured universities</h2><ul>${featured
      .map(
        (u) =>
          `<li><a href="/universities/${esc(u.slug)}">${esc(u.name)}</a>${
            u.city || u.country ? ` — ${esc([u.city, u.country].filter(Boolean).join(", "))}` : ""
          }${u.featured_summary ? `<p>${esc(u.featured_summary)}</p>` : ""}</li>`,
      )
      .join("")}</ul></section>`
  : "";

const nav = `<nav><a href="/">Home</a> · <a href="/courses">Courses</a> · <a href="/universities">Universities</a> · <a href="/scholarships">Scholarships</a> · <a href="/blog">Blog</a> · <a href="/faq">FAQ</a> · <a href="/about">About</a> · <a href="/contact">Contact</a></nav>`;
const footer = `<footer><p>UniDoxia is a trading name of Global Talent Gateway Ltd, registered in England and Wales, company number 16172129.</p></footer>`;

const pages = [
  {
    path: "/",
    title: "Study Abroad Support for International Students | UniDoxia",
    description:
      "UniDoxia helps international students discover courses and universities, prepare stronger applications, and understand visa and scholarship requirements.",
    body: `<h1>Study abroad support for international students</h1><p>Discover courses and universities, prepare stronger applications, and understand visa and scholarship requirements.</p>${featuredHtml}`,
  },
  {
    path: "/about",
    title: "About UniDoxia | Study Abroad Support for International Students",
    description:
      "UniDoxia helps international students around the world discover courses, prepare applications and understand next steps — guidance, not guarantees.",
    body: `<h1>About UniDoxia</h1><p>UniDoxia is a study-abroad support platform for international students worldwide. We help students research courses and universities, prepare applications, and understand common visa and scholarship requirements. We do not guarantee admission, scholarship, or visa outcomes.</p><h2>UK knowledge-trained leadership</h2><p>The leadership of UniDoxia has completed the British Council UK knowledge agent and counsellor training (certificate code 114757, valid until 16 July 2028).</p>`,
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions | UniDoxia",
    description:
      "Answers to common questions about studying abroad, university applications, student visas and how UniDoxia supports international students.",
    body: `<h1>Frequently Asked Questions</h1>${faqHtml}`,
    jsonLd: faqJsonLd,
  },
  {
    path: "/blog",
    title: "Study Abroad & Student Visa Blog | UniDoxia",
    description:
      "Weekly student visa updates, scholarship guides and practical study-abroad advice for international students from the UniDoxia Editorial Team.",
    body: `<h1>UniDoxia Blog</h1><ul>${posts
      .slice(0, 50)
      .map((p) => `<li><a href="/blog/${esc(p.slug)}">${esc(p.title)}</a></li>`)
      .join("")}</ul>`,
  },
  {
    path: "/courses",
    title: "Search Courses at Universities Abroad | UniDoxia",
    description:
      "Search undergraduate and postgraduate courses at universities in the UK, Canada, USA, Europe and more, with fees, intakes and entry requirements.",
    body: `<h1>Search courses abroad</h1><p>Compare courses by country, level, fees and intake.</p>`,
  },
  {
    path: "/universities",
    title: "University Directory for International Students | UniDoxia",
    description:
      "Browse universities and colleges welcoming international students, with locations, courses and profile details in one directory.",
    body: `<h1>University directory</h1>${featuredHtml}`,
  },
  {
    path: "/scholarships",
    title: "Scholarships for International Students | UniDoxia",
    description:
      "Find current scholarships for international students, with eligibility, deadlines and links to official application pages.",
    body: `<h1>Scholarships for international students</h1>`,
  },
  {
    path: "/scholarships/archive",
    title: "Scholarship Archive | UniDoxia",
    description: "Past scholarship listings for international students, kept for reference.",
    body: `<h1>Scholarship archive</h1>`,
  },
  {
    path: "/visa-calculator",
    title: "Student Visa Eligibility Calculator | UniDoxia",
    description:
      "Estimate your student visa readiness and see which documents and funds you may need before applying.",
    body: `<h1>Student visa calculator</h1>`,
  },
  {
    path: "/contact",
    title: "Contact UniDoxia | Study Abroad Help",
    description: "Contact the UniDoxia team for study-abroad questions, partnerships or support. Email info@unidoxia.com.",
    body: `<h1>Contact UniDoxia</h1><p>Email <a href="mailto:info@unidoxia.com">info@unidoxia.com</a>.</p>`,
  },
  {
    path: "/help",
    title: "Help Centre | UniDoxia",
    description: "Guides and answers for students, agents and universities using UniDoxia.",
    body: `<h1>Help Centre</h1>`,
  },
  {
    path: "/partnership",
    title: "University Partnerships | UniDoxia",
    description: "Partner with UniDoxia to reach qualified international students worldwide.",
    body: `<h1>University partnerships</h1>`,
  },
  {
    path: "/editorial-policy",
    title: "Editorial Policy | UniDoxia",
    description: "How UniDoxia sources, checks and corrects its study-abroad content, including AI-assisted drafting.",
    body: `<h1>Editorial policy</h1>`,
  },
  {
    path: "/legal/privacy",
    title: "Privacy Policy | UniDoxia",
    description: "How UniDoxia collects, uses and protects your personal data.",
    body: `<h1>Privacy policy</h1>`,
  },
  {
    path: "/legal/terms",
    title: "Terms of Service | UniDoxia",
    description: "The terms that apply when you use UniDoxia.",
    body: `<h1>Terms of service</h1>`,
  },
  ...posts.map((p) => ({
    path: `/blog/${p.slug}`,
    title: p.seo_title || `${p.title} | UniDoxia`,
    description: p.seo_description || p.excerpt || p.title,
    ogType: "article",
    body: `<article><h1>${esc(p.title)}</h1>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}</article>`,
  })),
];

const render = (page) => {
  const url = `${ORIGIN}${page.path === "/" ? "/" : page.path}`;
  const t = esc(page.title);
  const d = esc(page.description);
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${d}">`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${page.ogType || "website"}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${t}">`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${t}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${d}">`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${d}">`);
  if (page.jsonLd) {
    const json = JSON.stringify(page.jsonLd).replace(/</g, "\\u003c");
    html = html.replace("</head>", `<script type="application/ld+json">${json}</script>\n</head>`);
  }
  return html.replace('<div id="root"></div>', `<div id="root">${nav}<main>${page.body}</main>${footer}</div>`);
};

let count = 0;
for (const page of pages) {
  const out = page.path === "/" ? path.join(DIST, "index.html") : path.join(DIST, page.path, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(page));
  count++;
}
console.log(`[prerender] wrote ${count} pages (${posts.length} blog posts, ${featured.length} featured universities)`);
