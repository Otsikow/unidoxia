// Post-build: write dist/<route>/index.html for public pages so the raw HTML
// (before JavaScript) carries each page's own title, description, canonical,
// og:* tags and crawlable starter content. React replaces #root on load.
import fs from "node:fs";
import { spaRoutePatterns } from "./hosting-routes.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadPublicCatalogue, fetchPublicRows } from './catalogue/public-catalogue.mjs';
import { coursePage, universityPage, organisation, blogSchema, disambiguateMetadata } from './catalogue/seo-pages.mjs';

const ORIGIN = "https://unidoxia.com";
const DIST = path.resolve("dist");
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const { universities, programmes } = await loadPublicCatalogue();
const featured = universities.filter(u => u.featured).sort((a, b) => (a.featured_priority ?? Infinity) - (b.featured_priority ?? Infinity)).slice(0, 12);
const posts = await fetchPublicRows("blog_posts?select=id,slug,title,seo_title,seo_description,excerpt,published_at,updated_at,cover_image_url&status=eq.published");
const scholarships = await fetchPublicRows('scholarships?select=id,slug,title,name,summary,description,seo_title,seo_description,updated_at&slug=not.is.null&status=in.(Published,"Closing Soon",Upcoming,Closed,Archived)');
// Same English questions and answers as the React FAQ; fail rather than silently
// publishing an empty FAQ if its source is unavailable.
const en = (await import(pathToFileURL(path.resolve("src/i18n/locales/en.ts")).href)).default;
const faqSections = en.pages.faq.sections;
if (!faqSections.length) throw new Error('FAQ source is empty');

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
const footer = `<footer><p>UniDoxia is a trading name of Global Talent Gateway Ltd, registered in England and Wales, company number 16172129. Registered office: Office 10 Seagreen Turner Street, Redcar, England, TS10 1AZ.</p></footer>`;

const pages = [
  {
    path: "/",
    jsonLd: organisation,
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
  ...universities.map(u => universityPage(u, programmes)),
  ...programmes.map(p => coursePage(p, universities.find(u => u.id === p.university_id))),
  ...scholarships.map(s => ({
    path: `/scholarships/${encodeURIComponent(s.slug)}`,
    lastmod: s.updated_at,
    title: s.seo_title || `${s.title || s.name} | UniDoxia`,
    description: s.seo_description || s.summary || s.title || s.name,
    body: `<h1>${esc(s.title || s.name)}</h1><p>${esc(s.summary || s.description || '')}</p>`,
  })),
  ...posts.map((p) => ({
    path: `/blog/${encodeURIComponent(p.slug)}`,
    lastmod: p.updated_at || p.published_at,
    jsonLd: blogSchema(p),
    title: p.seo_title || `${p.title} | UniDoxia`,
    description: p.seo_description || p.excerpt || p.title,
    ogType: "article",
    body: `<article><h1>${esc(p.title)}</h1>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}</article>`,
  })),
];

disambiguateMetadata(pages);

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
  html = html.replace('</head>', `<meta name="prerender-path" content="${esc(page.path)}">\n</head>`);
  if (page.noindex) {
    html = html.replace(/<link rel="canonical"[^>]*>/, '').replace(/<meta property="og:url"[^>]*>/, '');
    html = html.replace('</head>', '<meta name="robots" content="noindex">\n</head>');
  }
  if (page.jsonLd) {
    const json = JSON.stringify(page.jsonLd).replace(/</g, "\\u003c");
    html = html.replace("</head>", `<script type="application/ld+json" data-prerender-seo="1">${json}</script>\n</head>`);
  }
  return html.replace('<div id="root"></div>', `<div id="root">${nav}<main>${page.body}</main>${footer}</div>`);
};

fs.writeFileSync(path.join(DIST, 'seo-hosting.json'), JSON.stringify({
  spaRoutes: spaRoutePatterns(),
  universityAliases: Object.fromEntries(universities.filter(u => u.slug && u.slug !== u.id).map(u => [`/universities/${u.id}`, `/universities/${encodeURIComponent(u.slug)}`])),
}, null, 2));
// Store route metadata only, never API keys or full database records.
fs.writeFileSync(path.join(DIST, 'seo-routes.json'), JSON.stringify(pages.map(({ path, lastmod, kind }) => ({ path, lastmod, kind })), null, 2));
fs.writeFileSync(path.join(DIST, '404.html'), render({ path: '/404', title: 'Page not found | UniDoxia', description: 'The requested page could not be found.', noindex: true, body: '<h1>Page not found</h1><p>The page may have moved or no longer exists.</p><a href="/">Return to Home</a>' }));
let count = 0;
for (const page of pages) {
  const out = page.path === "/" ? path.join(DIST, "index.html") : path.join(DIST, page.path, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(page));
  count++;
}
console.log(`[prerender] wrote ${count} pages (${posts.length} blog posts, ${featured.length} featured universities)`);
