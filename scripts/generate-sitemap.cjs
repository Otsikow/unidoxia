const fs = require("fs");
const path = require("path");

const BASE_URL = "https://www.unidoxia.com";
const now = new Date().toISOString();

// Only useful, indexable, public pages. Exclude auth/private/dashboards.
const entries = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/courses", priority: "0.9", changefreq: "weekly" },
  { path: "/universities", priority: "0.9", changefreq: "weekly" },
  { path: "/scholarships", priority: "0.9", changefreq: "weekly" },
  { path: "/visa-calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  {
    path: "/blog/uk-student-visa-funds-2026-evidence-mistakes",
    priority: "0.7",
    changefreq: "monthly",
    lastmod: "2026-07-13T08:40:30Z",
  },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/editorial-policy", priority: "0.5", changefreq: "monthly" },
  { path: "/legal/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/terms", priority: "0.3", changefreq: "yearly" },
];

const urls = entries
  .map((e) => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    <lastmod>${e.lastmod || now}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`)
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

fs.writeFileSync(path.resolve(__dirname, "../public/sitemap.xml"), sitemap);
console.log(`Sitemap generated with ${entries.length} URLs.`);
