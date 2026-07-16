
# Homepage Information-Architecture Audit (read-only)

Scope: `src/pages/Index.tsx` and its landing components. No code changes proposed here — this is a plan for a future edit.

---

## 1. Current section order (top → bottom)

1. **Hero** — video background, logo, H1 ("Study Abroad Opportunities…"), 2 CTAs (Start Your Study Journey → `/auth/signup`, Book a Free Consultation → WhatsApp `wa.me/447360961803`), floating trust ribbon.
2. **Welcome** — `TypewriterText` heading + descriptive paragraph (essentially a second hero).
3. **StudyProgramSearch** — search widget.
4. **Sign-up cards (3)** — Students → `/auth/signup?role=student`, Agents → `/agents/onboarding?next=…`, Universities → `/partnership`.
5. **Visa** — banner with CTA to `/visa-calculator`.
6. **Features (3 cards)** — Apply Easily, Track Realtime, Connect Agents (all link to student signup).
7. **ZoeExperienceSection** (lazy).
8. **FeaturedUniversitiesSection** (lazy).
9. **StoryboardSection** (lazy).
10. **SuccessStoriesMarquee**.
11. **Explore UniDoxia** — 4 internal links (courses, scholarships, visa-calculator, blog).
12. **LatestFromBlog** (lazy).
13. **FAQ** — audience-grouped accordion.
14. **Contact** — ContactForm.
15. **Footer**.

**Observed issues**
- Two "hero-like" blocks stacked (Hero + Welcome/Typewriter) — dilutes the primary message.
- **No CTA on the homepage routes to `/free-consultation`** — the production lead-capture page is invisible from Home. The "Book a Free Consultation" button jumps straight to WhatsApp, bypassing the on-site lead form.
- Two "internal navigation" blocks (Sign-up cards + Explore UniDoxia) do overlapping jobs.
- Students-facing content (Visa, Features, Zoe, Universities, Storyboard, Success, Blog) is scattered between and after the Agents/University CTA — audience flow jumps around.
- Features cards and Sign-up cards both point to `/auth/signup?role=student` → duplicate conversion path with no differentiation.
- 15 stacked sections = very long scroll, especially on mobile; FAQ + Contact at the very bottom is easy to miss.

---

## 2. Proposed professional section order

Audience flow: **Hook → Student value → Student proof → Student conversion → Secondary audiences → Trust/Resources → Support**.

1. **Hero (refined)** — single H1, subhead, two primary CTAs: (a) *Start Your Application* → `/auth/signup?role=student`, (b) *Book a Free Consultation* → **`/free-consultation`** (on-site lead form). Keep trust ribbon.
2. **StudyProgramSearch** — immediate utility for students who arrived with intent.
3. **Why UniDoxia (Features, 3 cards)** — Apply Easily / Track in Realtime / Expert Guidance.
4. **Zoe Experience** — AI assistant differentiator.
5. **Featured Universities** — credibility.
6. **How it works (Storyboard)** — step-by-step journey.
7. **Visa guidance banner** — CTA to `/visa-calculator`.
8. **Success stories marquee** — social proof.
9. **Latest from Blog** — freshness + SEO internal linking.
10. **Explore UniDoxia (compact link grid)** — courses, scholarships, visa, blog.
11. **Partner with UniDoxia (2 cards)** — Agents → `/agents/onboarding?…`, Universities → `/partnership`. Moved lower and merged into one section.
12. **FAQ**.
13. **Contact + Free Consultation banner** — final CTA back to `/free-consultation`.
14. **Footer**.

---

## 3. Sections to merge / shorten / move / remove

| Action | Section | Rationale |
|---|---|---|
| **Merge** | "Welcome / TypewriterText" **into Hero** | Two heroes cannibalise each other. Move the typewriter tagline just under the H1 (or drop it) and delete the standalone Welcome section. |
| **Merge** | "Sign-up cards (3)" → split: Student card **absorbed by Hero CTAs**; Agents + Universities become a **single "Partner with UniDoxia" section** near the bottom | The homepage is student-first; agents/universities are secondary audiences and belong after the student narrative. |
| **Shorten** | "Explore UniDoxia" | Keep the 4 tiles but reduce vertical padding (`py-16` → `py-10`) — it functions as a nav bridge, not a hero. |
| **Move** | "Visa" banner | Move after Storyboard so it reads as a logical next step in the journey, not a mid-flow interruption. |
| **Move** | "FeaturedUniversitiesSection" | Move above Storyboard so proof precedes process. |
| **Move** | "LatestFromBlog" | Move above Explore so the blog CTA is discovered before the compact link tiles. |
| **Remove (optional)** | Duplicate signup CTAs inside Features cards | Vary the destinations: e.g. Apply Easily → signup, Track Realtime → `/courses`, Connect Agents → `/agents/onboarding` (partner page). Prevents 4 CTAs on one page all going to the same URL. |
| **Add** | A single homepage CTA to **`/free-consultation`** (currently orphaned from Home) | Preserves the production lead-capture route the user flagged. |

Nothing is deleted outright; every removed/merged element keeps its destination reachable via header nav, footer, or a nearby CTA.

---

## 4. Hero / header improvements

- **Single H1**: keep "Study Abroad Opportunities for Students Worldwide"; delete the second H1-equivalent typewriter heading below (one H1 per page for SEO).
- **CTA labels & destinations**:
  - Primary: *Start Your Application* → `/auth/signup?role=student` (unchanged).
  - Secondary: *Book a Free Consultation* → **`/free-consultation`** (currently goes to WhatsApp only). Keep WhatsApp as a tertiary "Chat on WhatsApp" text link so the analytics event `logFreeConsultationWhatsAppClick` is preserved.
- **Trust ribbon**: keep the "connects students worldwide…" ribbon, but move it just below the CTAs (in normal flow) instead of `absolute bottom-*` — currently overlaps CTAs on some mobile viewport heights.
- **Logo opacity**: `opacity-60` + `brightness-0 invert` on the logo washes out the brand; raise to `opacity-90` or drop the filter.
- **Video**: keep autoplay/reduced-motion fallback logic as-is (accessibility-safe). Add a static `poster` attribute so first paint isn't the solid `#0e1a2b` block.
- **Header**: `LandingHeader` stays. Ensure it exposes the same routes we're relying on (Sign in, Courses, Scholarships, Blog, Partnership) so removing duplicated body CTAs doesn't strand any route.
- **Meta**: SEO title/description are strong — no change.

---

## 5. Mobile-specific considerations

- **Vertical length**: 15 → 13 sections still scrolls a lot. Reordering student-first means mobile users hit conversion content within the first 2–3 swipes instead of scrolling past Agents/Universities cards.
- **Hero CTAs**: currently stack full-width (`w-full sm:w-auto`) — good. Keep, but ensure the new `/free-consultation` button is the second (not third) tap target.
- **Floating trust ribbon**: `absolute bottom-28 sm:bottom-8` overlaps the CTA stack on short phones (iPhone SE, Android compact). Recommend converting to in-flow after CTAs on `<sm` breakpoints.
- **Sign-up / Partner cards**: current 3-column `lg:grid-cols-3` collapses to 1 column on mobile; the proposed 2-card "Partner" section (`sm:grid-cols-2`) reads better and shortens scroll.
- **Features cards**: images are `h-48` — fine, but lazy-load (`loading="lazy"`) all body images below the fold to protect LCP on 3G/4G.
- **Explore tiles**: `sm:grid-cols-2 lg:grid-cols-4` is good; shorten `py-16` to reduce empty vertical space on mobile.
- **FAQ**: audience-grouped accordion is mobile-friendly; keep collapsed by default (already `type="single" collapsible`).
- **Contact form**: consider moving above the footer with a compact "or WhatsApp us" fallback link so mobile users have a one-tap alternative.

---

## 6. Risk to routes / lead capture

**Routes referenced by Home today** — all must remain reachable after any edit:
- `/auth/signup`, `/auth/signup?role=student`, `/auth/signup?role=agent`
- `/agents/onboarding?next=…`
- `/partnership`
- `/visa-calculator`
- `/courses`, `/scholarships`, `/blog`
- `wa.me/447360961803` (WhatsApp consultation)
- `/free-consultation` (**production route — currently NOT linked from Home**; the plan adds it)

**Risk assessment**
- **Low risk**: reordering `<section>` blocks and merging Welcome into Hero — pure JSX moves, no route or handler changes.
- **Low risk**: moving Agents/Universities cards into a "Partner with UniDoxia" section lower on the page — same `href`s (`/agents/onboarding?next=…`, `/partnership`) preserved.
- **Medium risk** *if not careful*: changing the "Book a Free Consultation" button target. Mitigation: keep WhatsApp as a secondary link on the same row and keep `logFreeConsultationWhatsAppClick` wired to it, so the analytics event doesn't disappear.
- **Medium risk**: varying Features-card destinations. Mitigation: only re-point after confirming the target routes (`/courses`, `/agents/onboarding`) render for anonymous visitors.
- **No impact** on: dashboards, sign-in, auth callbacks, `/free-consultation` form submission (Edge Function `submit-website-lead`), Supabase RLS, i18n keys (all reused).
- **i18n note**: `pages.index.hero.ctas.*`, `pages.index.features.*`, `pages.index.faq.*`, `pages.index.visa.*`, `pages.index.contact.*` translation keys must be preserved. Merging Welcome into Hero can reuse `pages.index.hero.title` + `pages.index.hero.description` — no new keys strictly required, though a new `pages.index.hero.ctas.consultation` key would be cleaner than hard-coded strings.

**Nothing in this plan removes a route, form endpoint, analytics event, or dashboard entry.** All CTAs either stay put, move within Home, or gain a second on-site destination (`/free-consultation`).
