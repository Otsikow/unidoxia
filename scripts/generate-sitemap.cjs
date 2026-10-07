const fs = require('node:fs');
const path = require('node:path');
const routes = JSON.parse(fs.readFileSync(path.resolve('dist/seo-routes.json'), 'utf8'));
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const entries = routes.filter(route => route.kind !== 'catalogue');
const urls = entries.map(route => `  <url><loc>https://unidoxia.com${escape(route.path)}</loc>${route.lastmod ? `<lastmod>${escape(route.lastmod)}</lastmod>` : ''}</url>`).join('\n');
fs.writeFileSync(path.resolve('dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`Sitemap generated in dist with ${entries.length} public pages.`);
