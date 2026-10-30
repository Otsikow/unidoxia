import { businessFooter } from '../src/config/business.ts';
import { articleContent } from '../src/lib/articleContent.ts';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
const purifier = createDOMPurify(new JSDOM('').window);
// Post-build: write dist/<route>/index.html for public pages so the raw HTML
// (before JavaScript) carries each page's own title, description, canonical,
// og:* tags and crawlable starter content. React replaces #root on load.
import fs from "node:fs";
import { spaRoutePatterns } from "./hosting-routes.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadPublicCatalogue, fetchPublicRows } from './catalogue/public-catalogue.mjs';
import { coursePage, universityPage, organisation, blogSchema, scholarshipPage, disambiguateMetadata } from './catalogue/seo-pages.mjs';

const ORIGIN = "https://unidoxia.com";
const DIST = path.resolve("dist");
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const { universities, programmes } = await loadPublicCatalogue();
const featured = universities.filter(u => u.featured).sort((a, b) => (a.featured_priority ?? Infinity) - (b.featured_priority ?? Infinity)).slice(0, 12);
const posts = await fetchPublicRows("blog_posts?select=id,slug,title,seo_title,seo_description,excerpt,content_html,content_md,tags,published_at,updated_at,cover_image_url&status=eq.published");
const scholarships = await fetchPublicRows('scholarships?select=id,slug,title,name,summary,description,full_description,seo_title,seo_description,status,updated_at,published_at,institution_name,sponsor_name,country,study_level,academic_year,deadline,opening_date,scholarship_value,funding_type,number_of_awards,last_verified_at,eligible_nationalities,academic_requirements,english_requirements,work_experience_requirements,age_requirements,important_conditions,application_steps,official_source_url,official_application_url,featured_image,og_image,verification_status&slug=not.is.null&status=in.(Published,"Closing Soon",Upcoming,Closed,Archived)');
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

const nav = `<nav><a href="/">Home</a> · <a href="/courses">Courses</a> · <a href="/universities">Universities</a> · <a href="/destinations/united-kingdom">Study in the UK</a> · <a href="/scholarships">Scholarships</a> · <a href="/blog">Blog</a> · <a href="/faq">FAQ</a> · <a href="/about">About</a> · <a href="/contact">Contact</a></nav>`;
const footer = `<footer><p>${esc(businessFooter)}</p></footer>`;

const pages = [
  {
    path: "/",
    jsonLd: organisation,
    title: "Study Abroad from Africa: UK Universities & Support | UniDoxia",
    description:
      "Explore UK universities and courses with UniDoxia. Study abroad guidance for students in Africa and other international applicants.",
    body: `<h1>Study abroad from Africa and beyond</h1><p>Explore UK universities and courses, and get support with course selection, application preparation and your next steps towards studying abroad.</p><p><a href="/destinations/united-kingdom">Explore studying in the UK</a> · <a href="/free-consultation">Ask about your study plans</a></p>${featuredHtml}`,
  },
  {
    path: '/free-consultation', title: 'Free Study Abroad Consultation | UniDoxia',
    description: 'Ask UniDoxia about your study-abroad plans. Send a short enquiry with one contact method, your preferred destination and an optional question.',
    body: '<h1>Free study abroad consultation</h1><p>Tell us where you would like to study and how to contact you. You can share academic and application details later. This consultation is free; other services and university or government fees may apply. See our <a href="/pricing">service pricing</a>. We cannot guarantee admission, funding or a visa.</p><p>The short enquiry requests your name, one contact method, preferred destination and an optional question. Enable JavaScript to send the form, or email <a href="mailto:info@unidoxia.com">info@unidoxia.com</a>.</p><h2>What happens next?</h2><p>Your enquiry is saved for the admissions team to follow up using your chosen contact method. We can then discuss your study plans and any further information needed. Submitting an enquiry does not submit a university application.</p><p><a href="/intake-form">Use the full student intake form</a> if you are ready to share your academic background.</p>',
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
      "Student visa updates, scholarship guides and practical study-abroad advice for international students from the UniDoxia Editorial Team.",
    body: `<h1>UniDoxia Blog</h1><p>Explore study-abroad guidance on admissions, visas and scholarships. Confirm current requirements with the linked official sources.</p><ul>${posts

      .map((p) => `<li><a href="/blog/${esc(p.slug)}">${esc(p.title)}</a></li>`)
      .join("")}</ul>`,
  },
  {
    path: "/courses",
    title: "Search Courses at Universities Abroad | UniDoxia",
    description:
      "Search undergraduate and postgraduate courses at universities in the UK, Canada, USA, Europe and more, with fees, intakes and entry requirements.",
    body: `<h1>Search courses abroad</h1><p>Compare courses by country, level, fees and intake. Review each course's entry requirements and official sources before applying.</p><ul>${programmes.map(p => `<li><a href="/courses/${esc(p.id)}">${esc(p.name)} at ${esc(universities.find(u => u.id === p.university_id)?.name)}</a></li>`).join('')}</ul>`,
  },
  {
    path: "/universities",
    title: "University Directory for International Students | UniDoxia",
    description:
      "Browse universities and colleges welcoming international students, with locations, courses and profile details in one directory.",
    body: `<h1>University directory</h1><p>Explore listed institutions by destination, then compare courses and entry requirements. A listing does not by itself indicate a formal partnership.</p><ul>${universities.map(u => `<li><a href="/universities/${esc(u.slug || u.id)}">${esc(u.name)}</a> — ${esc([u.city, u.country].filter(Boolean).join(', '))}</li>`).join('')}</ul>`,
  },
  {
    path: "/scholarships",
    title: "Scholarships for International Students | UniDoxia",
    description:
      "Find current scholarships for international students, with eligibility, deadlines and links to official application pages.",
    body: `<h1>Scholarships for international students</h1><p>Compare funding, eligibility and deadlines. Verify the current round and conditions on the official scholarship source before applying.</p><ul>${scholarships.filter(s => !['Closed', 'Archived'].includes(s.status)).map(s => `<li><a href="/scholarships/${esc(s.slug)}">${esc(s.title || s.name)}</a></li>`).join('')}</ul>`,
  },
  {
    path: "/scholarships/archive",
    title: "Scholarship Archive | UniDoxia",
    description: "Past scholarship listings for international students, kept for reference.",
    body: `<h1>Scholarship archive</h1><p>Past scholarship listings are retained for reference. Check the official sources for new rounds and current eligibility.</p><ul>${scholarships.filter(s => ['Closed', 'Archived'].includes(s.status)).map(s => `<li><a href="/scholarships/${esc(s.slug)}">${esc(s.title || s.name)}</a></li>`).join('')}</ul><a href="/scholarships">Browse current scholarships</a>`,
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
    title: "Privacy Notice | UniDoxia",
    description: "How UniDoxia collects, uses and protects your personal data.",
    body: `<h1>Privacy Notice</h1>`,
  },
  {
    path: "/legal/terms",
    title: "Terms of Service | UniDoxia",
    description: "The terms that apply when you use UniDoxia.",
    body: `<h1>Terms of service</h1>`,
  },
  {
    path: '/destinations/united-kingdom', title: 'Study in the UK: Universities and Course Planning | UniDoxia',
    description: 'Explore listed UK universities and their courses. Plan your shortlist, compare entry requirements and prepare questions for a free study-abroad consultation.',
    body: `<h1>Study in the UK</h1><p>Start with the course you want to study, then compare locations, entry requirements and costs. UniDoxia's directory brings listed UK universities and their available course information together.</p><h2>Planning from Africa</h2><p>Check whether your qualifications meet each course’s requirements, and ask the university about acceptable English language evidence. Budget for tuition, living costs, travel and any application or visa fees. Verify current requirements with the university and <a href="https://www.gov.uk/student-visa">UK government student visa guidance</a>.</p><h2>Build your shortlist</h2><ol><li>Compare the course content, qualification, study mode and campus.</li><li>Check academic and English entry requirements against your background.</li><li>Review international tuition, scholarship conditions and future intakes using official sources.</li><li>Prepare questions about your choices before starting an application.</li></ol><h2>Explore listed UK universities</h2><p>A directory listing does not by itself indicate a formal university partnership.</p><ul>${universities.filter(u => u.country === 'United Kingdom').map(u => `<li><a href="/universities/${esc(u.slug || u.id)}">${esc(u.name)}</a> — ${esc(u.city || '')}<p>${esc(u.description || '')}</p><a href="/courses?university=${esc(u.id)}">Explore courses at ${esc(u.name)}</a></li>`).join('')}</ul><h2>Prepare your next step</h2><p>Read <a href="/faq">application and study-abroad questions</a> and check <a href="/scholarships">scholarship eligibility and deadlines</a>. A consultation is free; review <a href="/pricing">service pricing</a> and confirm any university or government fees. Guidance does not guarantee admission, funding or a visa.</p><a href="/free-consultation">Ask about your UK study plans</a>`,
  },
  ...universities.map(u => universityPage(u, programmes)),
  ...programmes.map(p => coursePage(p, universities.find(u => u.id === p.university_id))),
  ...scholarships.map(scholarshipPage),
  ...posts.map((p) => ({
    path: `/blog/${encodeURIComponent(p.slug)}`,
    lastmod: p.updated_at || p.published_at,
    jsonLd: blogSchema(p),
    title: p.seo_title || `${p.title} | UniDoxia`,
    description: p.seo_description || p.excerpt || p.title,
    ogType: "article",
    body: `<article><h1>${esc(p.title)}</h1>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}${purifier.sanitize(articleContent(p))}<section><h2>Plan your next step</h2>${/\b(UK|United Kingdom|British)\b/i.test([p.title, ...(p.tags || [])].join(' ')) ? '<p><a href="/destinations/united-kingdom">Plan your UK university shortlist</a>.</p>' : ''}${/visa/i.test([p.title, ...(p.tags || [])].join(' ')) ? '<p><a href="/visa-calculator">Explore student visa readiness</a> and <a href="/faq">read common application questions</a>.</p>' : ''}<p>Compare <a href="/courses">courses and entry requirements</a>, explore <a href="/universities">universities by destination</a> or check <a href="/scholarships">scholarship eligibility and deadlines</a>.</p><p><a href="/free-consultation">Ask about your study plans in a free consultation</a>.</p></section></article>`,
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
  if (page.path !== "/") html = html.replace(/<link rel="preload" as="image" href="\/videos\/hero-poster.webp"[^>]*>/, "");
  html = html.replace('</head>', `<meta name="prerender-path" content="${esc(page.path)}">\n</head>`);
  if (page.noindex) {
    html = html.replace('</head>', '<meta name="robots" content="noindex">\n</head>');
  }
  if (page.jsonLd) {
    const json = JSON.stringify(page.jsonLd).replace(/</g, "\\u003c");
    html = html.replace("</head>", `<script type="application/ld+json" data-prerender-seo="1">${json}</script>\n</head>`);
  }
  return html.replace('<div id="root"></div>', `<div id="root">${nav}<main>${purifier.sanitize(page.body)}</main>${footer}</div>`);
};

fs.writeFileSync(path.join(DIST, 'seo-hosting.json'), JSON.stringify({
  spaRoutes: spaRoutePatterns(),
  universityAliases: Object.fromEntries(universities.filter(u => u.slug && u.slug !== u.id).map(u => [`/universities/${u.id}`, `/universities/${encodeURIComponent(u.slug)}`])),
}, null, 2));
// Store route metadata only, never API keys or full database records.
fs.writeFileSync(path.join(DIST, 'seo-routes.json'), JSON.stringify(pages.map(({ path, lastmod, kind, noindex }) => ({ path, lastmod, kind, noindex })), null, 2));
fs.writeFileSync(path.join(DIST, '404.html'), render({ path: '/404', title: 'Page not found | UniDoxia', description: 'The requested page could not be found.', noindex: true, body: '<h1>Page not found</h1><p>The page may have moved or no longer exists.</p><a href="/">Return to Home</a>' }).replace(/<link rel="canonical"[^>]*>/, '').replace(/<meta property="og:url"[^>]*>/, ''));
let count = 0;
for (const page of pages) {
  const out = page.path === "/" ? path.join(DIST, "index.html") : path.join(DIST, page.path, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(page));
  count++;
}
console.log(`[prerender] wrote ${count} pages (${posts.length} blog posts, ${featured.length} featured universities)`);
