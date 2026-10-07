// Optional Cloudflare Workers static-assets adapter. No production changes occur
// until explicitly deployed and attached to the custom domain (see docs).
import routes from '../dist/seo-routes.json' with { type: 'json' };
import hosting from '../dist/seo-hosting.json' with { type: 'json' };

const pages = new Set(routes.map(route => route.path));
const patterns = hosting.spaRoutes.map(route => new RegExp(`^${route.split('/').map(segment => segment === '*' ? '.*' : segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/').replace('/.*', '(?:/.*)?')}$`));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.unidoxia.com') {
      url.hostname = 'unidoxia.com';
      return Response.redirect(url.href, 301);
    }
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const alias = hosting.universityAliases[pathname];
    if (alias) {
      url.pathname = alias;
      return Response.redirect(url.href, 301);
    }
    if (pages.has(pathname)) {
      url.pathname = pathname === '/' ? '/index.html' : `${pathname}/index.html`;
      return env.ASSETS.fetch(new Request(url, request));
    }
    if (patterns.some(pattern => pattern.test(pathname))) {
      url.pathname = '/index.html';
      const response = await env.ASSETS.fetch(new Request(url, request));
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex');
      return new Response(response.body, { status: response.status, headers });
    }
    // Assets are served only when they exist. Disable SPA fallback on ASSETS.
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    url.pathname = '/404.html';
    const missing = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(missing.headers);
    headers.set('X-Robots-Tag', 'noindex');
    headers.set('Cache-Control', 'no-cache');
    return new Response(missing.body, { status: 404, headers });
  },
};
