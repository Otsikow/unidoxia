# British Council training strip: supplied-reference restoration

7 November 2026. Eric supplied a screenshot and explicitly requested its original logo, wording, layout and single action without editorial changes. This supersedes the earlier adapted strip.

The section remains immediately after course search. It restores the original repository British Council logo, the exact “UK knowledge-trained guidance” heading and original paragraph, and the single “View training details” link to `/about`. Desktop uses the logo, description and right-aligned action; mobile stacks the same content. The dark version matches the supplied charcoal background and white logo. Light mode uses the original purple logo. The added eyebrow, certificate line and second action have been removed.

The individual training badge, certificate PDFs and explanatory information remain on the existing About and personal-profile routes. Their original assets and wording were not altered. Other homepage sections, saved theme preferences and the first-visit light default are unchanged. The logo is restored from the existing project at Eric's explicit direction; no new third-party endorsement or permission is asserted.

Eight focused desktop/mobile browser checks passed, covering the restored logo and single action, the About-to-personal-badge route and award PDF, and existing partner/social flows. Changed-file lint, diff whitespace checks and the production build passed, including 1,536 public SEO pages. Fresh 390/768/1440px full-page screenshots fit their viewport without page errors or sampled axe A/AA violations. Light and dark screenshots were inspected. Initial HTML includes the same logo, copy and single action without JavaScript.

![Desktop dark strip matching the reference](homepage-review/training-strip-desktop.png)

![Mobile strip](homepage-review/training-strip-mobile.png)

Full-page screenshots and raw logs are in the workspace `outputs/unidoxia-training-reference/` directory. The change remains on `redesign/public-homepage` in PR #1288. No new contact test, live data write, main-branch merge or production deployment was made.
