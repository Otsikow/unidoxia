import { homeEyebrow, homeHeadline, homeIntro, homeNav, homePhoto, studentSignup } from '../src/lib/homepage.mjs';

// Independent of the downloaded application CSS/JS: public fallback stays usable
// while the first React route loads, including on slow or failed connections.
export const firstPaintCss = `
#root[data-startup-pending]{display:none!important}
#site-first-paint.fp-standard{font-family:Arial,Helvetica,sans-serif;color:#172033;background:#fff;line-height:1.65;min-height:100vh}
#site-first-paint.fp-standard *{box-sizing:border-box}
#site-first-paint.fp-standard a{color:#174e99;text-underline-offset:3px}
#site-first-paint.fp-standard .fp-header{padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:24px;flex-wrap:wrap}
#site-first-paint.fp-standard .fp-brand{display:inline-flex;align-items:center;gap:10px;font-size:20px;font-weight:700;text-decoration:none;flex-shrink:0}
#site-first-paint.fp-standard .fp-brand img{display:block;background:white;padding:4px;border-radius:8px}
#site-first-paint.fp-standard nav{font-size:14px;line-height:2.5}
#site-first-paint.fp-standard main{max-width:1120px;margin:auto;padding:48px 24px;overflow-wrap:anywhere}
#site-first-paint.fp-standard h1{font-size:clamp(30px,5vw,52px);line-height:1.1;font-weight:700;margin:0 0 24px}
#site-first-paint.fp-standard h2{font-size:26px;line-height:1.3;font-weight:700;margin:36px 0 16px}
#site-first-paint.fp-standard h3{font-size:20px;font-weight:700;margin:24px 0 12px}
#site-first-paint.fp-standard p{margin:0 0 20px}
#site-first-paint.fp-standard ul,#site-first-paint.fp-standard ol{padding-left:24px}
#site-first-paint.fp-standard img{max-width:100%;height:auto}
#site-first-paint.fp-standard footer{padding:28px 24px;background:#f1f5f9;color:#475569;font-size:12px}
`;
const pendingRoot = '<div id="root" data-startup-pending aria-hidden="true" inert></div>';

export function renderFirstPaint({ path, body, nav, footer }) {
  if (path === '/') {
    return `
      <div id="site-first-paint" class="udx-home">
        <header class="udx-header">
          <a class="udx-skip" href="#main-content">Skip to content</a>
          <div class="udx-wrap udx-header-inner">
            <a class="udx-brand" href="/" aria-label="UniDoxia home"><img src="/home/logo.webp" width="36" height="36" alt="">UniDoxia</a>
            <div class="udx-navigation udx-static-desktop">${homeNavigation()}</div>
            <details class="udx-static-menu"><summary>Menu</summary>${homeNavigation()}</details>
          </div>
        </header>
        <main id="main-content" tabindex="-1">${body}</main>
        <div class="udx-footer"><div class="udx-wrap">${footer}</div></div>
      </div>${pendingRoot}`;
  }

  return `<div id="site-first-paint" class="fp-standard"><header class="fp-header"><a class="fp-brand" href="/" aria-label="UniDoxia home"><img src="/favicon-96.png" width="40" height="40" alt="">UniDoxia</a>${nav}</header><main>${body}</main>${footer}</div>${pendingRoot}`;
}

function homeNavigation() {
  const links = homeNav.map(({ href, label }) => `<a href="${href}">${label}</a>`).join('');
  return `<nav class="udx-nav" aria-label="Main navigation">${links}</nav><div class="udx-account"><a class="udx-quiet" href="/auth/login">Sign in</a><a class="udx-button udx-button-small" href="${studentSignup}">Get started</a></div>`;
}

export function homeFirstPaint(featuredHtml) {
  return `
    <section class="udx-hero">
      <div class="udx-wrap udx-hero-grid">
        <div class="udx-hero-copy">
          <p class="udx-kicker">${homeEyebrow}</p>
          <h1>${homeHeadline[0]} <span>${homeHeadline[1]}</span></h1>
          <p class="udx-intro">${homeIntro}</p>
          <div class="udx-actions">
            <a class="udx-button" href="/courses">Find a course <span aria-hidden="true">→</span></a>
            <a class="udx-text-link" href="#how-it-works">How it works <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <img class="udx-hero-photo" src="${homePhoto.src}" srcset="${homePhoto.srcSet}" sizes="${homePhoto.sizes}" width="${homePhoto.width}" height="${homePhoto.height}" alt="${homePhoto.alt}" fetchpriority="high">
      </div>
    </section>
    <section class="udx-search" aria-labelledby="course-search">
      <div class="udx-wrap udx-search-inner">
        <div><h2 id="course-search">What would you like to study?</h2><p>Explore the catalogue by subject or university.</p></div>
        <form action="/courses" method="get" role="search" aria-labelledby="course-search">
          <label class="udx-sr-only" for="course-query">Course or university</label>
          <div class="udx-search-field"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg><input id="course-query" name="q" type="search" placeholder="Try nursing or business"></div>
          <button class="udx-button" type="submit">Search courses <span aria-hidden="true">→</span></button>
        </form>
      </div>
    </section>
    <section class="udx-section udx-wrap" id="destinations" tabindex="-1">
      <p class="udx-kicker">Study destinations</p>
      <h2>Where could you study?</h2>
      <a class="udx-text-link" href="/destinations/united-kingdom">Read the UK study guide</a>
      <a class="udx-text-link" href="/universities">View the university directory</a>
      ${featuredHtml}
    </section>
    <section class="udx-section udx-journey" id="how-it-works" tabindex="-1">
      <div class="udx-wrap"><h2>From shortlist to next steps</h2><p>Find your course, prepare your documents, apply and plan what comes after an offer.</p></div>
    </section>
    <section class="udx-next">
      <div class="udx-wrap udx-next-inner">
        <div><h2>Ready to apply?</h2><p>Start your student profile or speak to an adviser about your plans.</p></div>
        <div class="udx-actions"><a class="udx-button" href="${studentSignup}">Start your application</a><a class="udx-text-link" href="/free-consultation">Book a free consultation</a></div>
      </div>
    </section>
    <div class="udx-wrap udx-support"><a href="https://wa.me/447360961803">Chat on WhatsApp</a><a href="/contact">Contact us</a><a href="/faq">FAQs</a><a href="/legal/privacy">Privacy policy</a><a href="/legal/terms">Terms of service</a></div>`;
}
