import { articleCover, articleCoverSources, articleCoverSizes, articleDate, selectHomeArticles } from '../src/lib/homeBlog.ts';
import { esc } from '../src/lib/publicSeo.mjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { homePartnerships, homeFooterGroups, homeSocials, homeSocialIcons } from '../src/lib/homeEditorial.mjs';
import { homeFooterIcons } from '../src/lib/homeFooterIcons.ts';
import { business } from '../src/config/business.ts';
import { STUDY_DESTINATIONS } from '../src/lib/studyDestinations.ts';
import { destinationHref, homeAssurances, homeDestinations, homeEyebrow, homeHeadline, homeIntro, homeNav, homePhoto, homePhotoAvifSrcSet, homeSteps, studentSignup, whatsappIconPath } from '../src/lib/homepage.mjs';

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
        <div class="udx-footer"><div class="udx-wrap">${homeFooterHtml()}${footer}</div></div>
        <a class="udx-whatsapp" href="https://wa.me/447360961803" target="_blank" rel="noopener noreferrer" aria-label="Chat with UniDoxia on WhatsApp (opens in a new tab)"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="${whatsappIconPath}"></path></svg><span>WhatsApp</span></a>
      </div>${pendingRoot}`;
  }

  return `<div id="site-first-paint" class="fp-standard"><header class="fp-header"><a class="fp-brand" href="/" aria-label="UniDoxia home"><img src="/favicon-96.png" width="40" height="40" alt="">UniDoxia</a>${nav}</header><main>${body}</main>${footer}</div>${pendingRoot}`;
}

function homeNavigation() {
  const links = homeNav.map(({ href, label }) => `<a href="${href}">${label}</a>`).join('');
  return `<nav class="udx-nav" aria-label="Main navigation">${links}</nav><div class="udx-account"><a class="udx-quiet" href="/auth/login">Sign in</a><a class="udx-button udx-button-small" href="${studentSignup}">Get started</a></div>`;
}

export function homeFirstPaint(featuredHtml, articles = []) {
  return `
    <section class="udx-hero">
      <div class="udx-wrap udx-hero-grid">
        <div class="udx-hero-copy">
          <p class="udx-kicker">${homeEyebrow}</p>
          <h1>${homeHeadline[0]} <span>${homeHeadline[1]}</span></h1>
          <p class="udx-intro">${homeIntro}</p>
          <div class="udx-actions">
            <a class="udx-button" href="/courses">Find a course <span aria-hidden="true">→</span></a>
            <a class="udx-text-link" href="/free-consultation">Free consultation <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <figure class="udx-hero-portrait"><picture><source type="image/avif" srcset="${homePhotoAvifSrcSet}" sizes="${homePhoto.sizes}"><img class="udx-hero-photo" src="${homePhoto.src}" srcset="${homePhoto.srcSet}" sizes="${homePhoto.sizes}" width="${homePhoto.width}" height="${homePhoto.height}" alt="${homePhoto.alt}" fetchpriority="high"></picture></figure>
      </div>
    </section>
    <section class="udx-search" aria-labelledby="course-search">
      <div class="udx-wrap udx-search-inner">
        <div><h2 id="course-search">What would you like to study?</h2><p>Explore the catalogue by subject or university.</p></div>
        <form action="/courses" method="get" role="search" aria-labelledby="course-search">
          <div class="udx-home-query"><label class="udx-search-label" for="course-query">Course or university</label>
          <div class="udx-search-field"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg><input id="course-query" name="q" type="search" placeholder="Try nursing or business"></div></div>
          <div class="udx-home-country"><label class="udx-search-label" for="home-country">Destination</label><select id="home-country" name="country"><option value="">Any destination</option>${STUDY_DESTINATIONS.map(country => `<option>${esc(country)}</option>`).join('')}</select></div>
          <div class="udx-home-level"><label class="udx-search-label" for="home-level">Study level</label><select id="home-level" name="level"><option value="">Any study level</option><option>Undergraduate</option><option>Postgraduate</option><option value="PHD">PhD</option></select></div>
          <button class="udx-button" type="submit">Search courses <span aria-hidden="true">→</span></button>
        </form>
      </div>
    </section>
    <section class="udx-section udx-wrap" id="destinations" tabindex="-1">
      <div class="udx-section-head">
        <div><p class="udx-kicker">Study destinations</p><h2>Where could you study?</h2></div>
        <p>Compare courses in these six destinations. For other countries, <a href="/free-consultation">ask us about current options</a>.</p>
      </div>
      <div class="udx-destination-grid">
        ${homeDestinations.map(({ name, country, image, alt }) => `
          <article class="udx-destination">
            <a href="${destinationHref(country)}" aria-label="Explore courses in ${name}">
              <img src="/home/${image}.webp" srcset="/home/${image}-320.webp 320w, /home/${image}-660.webp 660w, /home/${image}.webp 1000w" sizes="(max-width: 519px) calc(50vw - 24px), (max-width: 959px) 44vw, 380px" width="1000" height="640" alt="${alt}" loading="lazy" fetchpriority="low" decoding="async">
              <span class="udx-destination-name">${name}<span aria-hidden="true">↗</span></span>
            </a>
            <p>Explore courses</p>
          </article>`).join('')}
      </div>
      <div class="udx-destination-resources">
        <a class="udx-text-link" href="/courses">Explore more destinations →</a>
        <a class="udx-text-link" href="/universities">Browse all universities →</a>
        <a class="udx-text-link" href="/destinations/united-kingdom">Read the UK study guide ↗</a>
      </div>
      ${featuredHtml}
    </section>
    <section class="udx-section udx-journey" id="how-it-works" tabindex="-1">
      <div class="udx-wrap">
        <div class="udx-section-head">
          <div><p class="udx-kicker">How it works</p><h2>How to apply</h2></div>
          <p>Choose a course, prepare your documents and follow your application in your account.</p>
        </div>
        <div class="udx-journey-grid">
        ${homeEditorialPhoto('study-planning', 'Two students comparing notes and researching together with a laptop in a library', [640, 1000], .9)}
        <ol class="udx-steps">
          ${homeSteps.map(({ title, text, href, label }, index) => `<li><span aria-hidden="true">0${index + 1}</span><h3>${title}</h3><p>${text}</p><a class="udx-text-link" href="${esc(href)}">${label} ↗</a></li>`).join('')}
        </ol>
        </div>
        <div class="udx-assurance">
          ${homeAssurances.map(({ title, text, href, label }) => `<div><h3>${title}</h3><p>${text}</p><a class="udx-text-link" href="${href}">${label} ↗</a>${href.includes('training-certificate') ? '<a class="udx-text-link" href="/about/eric-arthur">Eric Arthur’s credentials ↗</a>' : ''}</div>`).join('')}
        </div>
      </div>
    </section>
    ${homeInsights(articles)}
    ${homePartnershipHtml()}
    <section class="udx-next">
      <div class="udx-wrap udx-next-inner">
        ${homeEditorialPhoto('next-chapter', 'Students talking outside a university building with books and backpacks', [640, 1000], 1.3)}
        <div class="udx-next-copy">
        <div><h2>Ready to apply?</h2><p>Create an account to add your details and prepare your application. If you need help choosing a course, book a free consultation.</p></div>
        <div class="udx-actions"><a class="udx-button" href="${studentSignup}">Start your application</a><a class="udx-text-link" href="/free-consultation">Speak to an adviser</a></div>
        </div>
      </div>
    </section>
    <div class="udx-wrap udx-support"><a href="https://wa.me/447360961803">Chat on WhatsApp</a><a href="/contact">Contact us</a><a href="/faq">FAQs</a><a href="/legal/privacy">Privacy policy</a><a href="/legal/terms">Terms of service</a></div>
    <div class="udx-wrap"><details class="udx-home-contact"><summary>Send the team a message <span aria-hidden="true">+</span></summary><div class="udx-contact-content"><div><h2>Have a question?</h2><p>Email <a href="mailto:info@unidoxia.com">info@unidoxia.com</a> or visit our <a href="/contact">contact page</a>. For a free conversation about your options, <a href="/free-consultation">book a consultation</a>.</p></div><p>Enable JavaScript to use the enquiry form.</p></div></details></div>`;
}

function homeEditorialPhoto(image, alt, widths = [640, 1100], ratio = 1.6) {
  const largest = widths.at(-1);
  const sources = extension => widths.map(w => `/home/${image}-${w}.${extension} ${w}w`).join(', ');
  const sizes = '(max-width: 767px) calc(100vw - 32px), 48vw';
  return `<picture class="udx-editorial-photo"><source type="image/avif" srcset="${sources('avif')}" sizes="${sizes}"><img src="/home/${image}-${largest}.webp" srcset="${sources('webp')}" sizes="${sizes}" width="${largest}" height="${Math.round(largest / ratio)}" alt="${esc(alt)}" loading="lazy" decoding="async" fetchpriority="low"></picture>`;
}

function homePartnershipHtml() {
  return `<section class="udx-section udx-partnerships" aria-labelledby="partnerships-title"><div class="udx-wrap">
    <div class="udx-section-head"><div><p class="udx-kicker">Work with UniDoxia</p><h2 id="partnerships-title">Recruit students with UniDoxia</h2></div><p>We welcome enquiries from education agents, universities and colleges interested in recruiting students from Africa.</p></div>
    <div class="udx-partnership-grid">${homePartnerships.map(p => `<article>${homeEditorialPhoto(p.image, p.alt)}<div class="udx-partnership-copy"><p class="udx-partnership-audience">${esc(p.audience)}</p><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><a class="udx-text-link" href="${p.href}">${esc(p.label)} ↗</a></div></article>`).join('')}</div>
  </div></section>`;
}

function homeSocialHtml() {
  return `<nav class="udx-socials" aria-label="UniDoxia social media">${homeSocials.map(({ name, href, icon }) => {
    const art = icon === 'whatsapp' ? { path: whatsappIconPath, stroke: false } : homeSocialIcons[icon];
    return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="UniDoxia on ${name} (opens in a new tab)" title="${name}"><svg width="19" height="19" viewBox="0 0 24 24" fill="${art.stroke ? 'none' : 'currentColor'}" ${art.stroke ? 'stroke="currentColor" stroke-width="1.8"' : ''} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${art.path}"></path></svg></a>`;
  }).join('')}</nav>`;
}

function homeFooterHtml() {
  const icon = name => renderToStaticMarkup(createElement(homeFooterIcons[name], { size: 16, strokeWidth: 1.6, 'aria-hidden': true }));
  return `<div class="udx-footer-grid"><div class="udx-footer-about"><a class="udx-brand" href="/" aria-label="UniDoxia home"><img src="/home/logo.webp" width="40" height="40" alt="">UniDoxia</a><p>Course search and application support for students from Africa.</p><a href="mailto:${esc(business.email)}">${icon('mail')}<span>${esc(business.email)}</span></a>${homeSocialHtml()}</div>${homeFooterGroups.map(({ title, links }) => `<div><h2>${esc(title)}</h2><ul>${links.map(({ label, href, icon: name }) => `<li><a href="${esc(href)}">${icon(name)}<span>${esc(label)}</span></a></li>`).join('')}</ul></div>`).join('')}</div>`;
}


function homeInsights(articles) {
  const posts = selectHomeArticles(articles);
  return `
    <section class="udx-section udx-insights" aria-labelledby="latest-blog-heading" id="insights">
      <div class="udx-wrap">
        <div class="udx-section-head">
          <div><p class="udx-kicker">From the blog</p><h2 id="latest-blog-heading">Advice for studying abroad</h2></div>
          <div class="udx-insights-intro"><p>Read about applications, scholarships and preparing for student life abroad.</p><a href="/blog" class="udx-text-link">View all articles →</a></div>
        </div>
        <div class="udx-insights-grid">
          ${posts.map((post, index) => `
            <article class="udx-insight">
              <a href="/blog/${esc(post.slug)}" class="udx-insight-link">
                ${post.cover_image_url ? `<img src="${esc(articleCover(post.cover_image_url))}" ${articleCoverSources(post.cover_image_url) ? `srcset="${esc(articleCoverSources(post.cover_image_url))}" sizes="${articleCoverSizes(index)}"` : ''} alt="" width="1280" height="720" loading="lazy" fetchpriority="low" decoding="async">` : ''}
                <div class="udx-insight-copy">
                  <div class="udx-article-meta">
                    ${post.tags?.[0] ? `<span>${esc(post.tags[0])}</span>` : ''}
                    ${articleDate(post.published_at) ? `<time datetime="${esc(post.published_at)}">${esc(articleDate(post.published_at))}</time>` : ''}
                  </div>
                  <h3>${esc(post.title)}</h3>
                  ${post.excerpt ? `<p>${esc(post.excerpt)}</p>` : ''}
                  <span class="udx-text-link">Read article →</span>
                </div>
              </a>
            </article>`).join('')}
        </div>
      </div>
    </section>`;
}
