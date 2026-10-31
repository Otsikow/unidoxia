// Independent of the downloaded application CSS/JS: public fallback stays usable
// while the first React route loads, including on slow or failed connections.
export const firstPaintCss = `
#root[data-startup-pending]{display:none!important}
#site-first-paint{font-family:Arial,Helvetica,sans-serif;color:#172033;background:#fff;line-height:1.65;min-height:100vh}
#site-first-paint *{box-sizing:border-box}
#site-first-paint a{color:#174e99;text-underline-offset:3px}
#site-first-paint .fp-header{padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:24px;flex-wrap:wrap}
#site-first-paint .fp-brand{display:inline-flex;align-items:center;gap:10px;font-size:20px;font-weight:700;text-decoration:none;flex-shrink:0}
#site-first-paint .fp-brand img{display:block;background:white;padding:4px;border-radius:8px}
#site-first-paint nav{font-size:14px;line-height:2.5}
#site-first-paint main{max-width:1120px;margin:auto;padding:48px 24px;overflow-wrap:anywhere}
#site-first-paint h1{font-size:clamp(30px,5vw,52px);line-height:1.1;font-weight:700;margin:0 0 24px}
#site-first-paint h2{font-size:26px;line-height:1.3;font-weight:700;margin:36px 0 16px}
#site-first-paint h3{font-size:20px;font-weight:700;margin:24px 0 12px}
#site-first-paint p{margin:0 0 20px}
#site-first-paint ul,#site-first-paint ol{padding-left:24px}
#site-first-paint img{max-width:100%;height:auto}
#site-first-paint footer{padding:28px 24px;background:#f1f5f9;color:#475569;font-size:12px}
#site-first-paint.fp-home .fp-header{position:absolute;z-index:2;left:16px;right:16px;top:16px;max-width:1200px;margin:auto;border:1px solid #ffffff40;border-radius:12px;padding:10px 16px;background:#071526b3;color:#fff}
#site-first-paint.fp-home .fp-header a{color:white}
#site-first-paint.fp-home main{max-width:none;padding:0}
#site-first-paint .fp-hero{position:relative;isolation:isolate;min-height:min(900px,100svh);padding:180px 24px 96px;background:#0e1a2b;color:white;text-align:center;display:flex;align-items:center;justify-content:center}
#site-first-paint .fp-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
#site-first-paint .fp-hero:before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#071526c9,#07152688 45%,#071526d6);z-index:-1}
#site-first-paint .fp-hero-content{max-width:880px}
#site-first-paint .fp-hero-logo{width:88px;height:88px;background:white;padding:12px;border-radius:16px;margin:0 auto 24px;display:block}
#site-first-paint .fp-hero h1{font-size:clamp(30px,5vw,60px);letter-spacing:-.03em;text-shadow:0 2px 16px #0008}
#site-first-paint .fp-hero p{max-width:672px;margin:0 auto 20px;font-size:clamp(16px,2vw,20px)}
#site-first-paint .fp-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin:28px 0 20px}
#site-first-paint .fp-actions a{display:inline-block;border:1px solid #ffffff99;background:#ffffff20;border-radius:999px;padding:12px 24px;color:#fff;text-decoration:none;font-weight:700}
#site-first-paint .fp-hero .fp-whatsapp{color:white;font-size:15px}
#site-first-paint .fp-body{max-width:1120px;padding:36px 24px;margin:auto}
@media(max-width:640px){#site-first-paint .fp-header{gap:8px}#site-first-paint nav{font-size:12px;line-height:2}#site-first-paint .fp-hero{padding:200px 24px 64px}#site-first-paint .fp-actions{flex-direction:column}#site-first-paint .fp-actions a{width:100%}}
`;
export function renderFirstPaint({path,body,nav,footer}) {
  return `<div id="site-first-paint"${path==='/'?' class="fp-home"':''}><header class="fp-header"><a class="fp-brand" href="/" aria-label="UniDoxia home"><img src="/favicon-96.png" width="40" height="40" alt="">UniDoxia</a>${nav}</header><main>${body}</main>${footer}</div><div id="root" data-startup-pending aria-hidden="true" inert></div>`;
}
export function homeFirstPaint(featuredHtml) {
  return `<section class="fp-hero"><img class="fp-poster" src="/videos/hero-poster.webp" alt="" fetchpriority="high"><div class="fp-hero-content"><img class="fp-hero-logo" src="/favicon-96.png" width="88" height="88" alt="UniDoxia logo"><h1>Study abroad from Africa and beyond</h1><p>Explore UK universities and courses, and get support with course selection, application preparation and your next steps towards studying abroad.</p><p><em>One platform. Global opportunities. Expert support.</em></p><div class="fp-actions"><a href="/auth/signup?role=student">Start Your Application</a><a href="/free-consultation">Book a Free Consultation</a></div><a class="fp-whatsapp" href="https://wa.me/447360961803">Chat on WhatsApp</a></div></section><div class="fp-body"><p><a href="/destinations/united-kingdom">Explore studying in the UK</a></p>${featuredHtml}</div>`;
}
