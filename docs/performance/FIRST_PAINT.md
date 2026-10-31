# Styled public first paint

The post-build renderer previously placed unstyled navigation/article/footer HTML inside React's mount root. Before JavaScript loaded, visitors saw that bare content; React then replaced it with intermediate loaders before the final page appeared.

Public prerenders now include a separately styled, accessible first view. Critical scoped CSS is inline, so it does not depend on the application stylesheet. The homepage uses the existing hero poster, logo, headline and primary links. Other public routes retain their real crawlable content and legal footer. All normal links work without JavaScript.

The pending React root is non-visible, inert and hidden from assistive technology while the static view remains available. `InitialPageReady` sits inside the existing route Suspense boundary and switches the first view to the finished route in a layout effect. This avoids showing the intermediate React loader and does not introduce an arbitrary delay. Failure to load the app leaves useful public content instead of a blank overlay. The approved final React page design is unchanged.

Validation:
- First-paint markup and actual suspended-route handoff regression tests.
- Desktop/mobile built-page inspection with app scripts and external app styles removed: readable branded first view, loaded hero image, working links, no horizontal overflow at 390px.
- Normal built-app browser check: first-view sibling removed, root visible, pending/inert accessibility flags removed, exactly one main headline.
- Full production build and all 1,533 rendered-page SEO checks pass, including single H1, metadata, canonicals, structured data, legal footer and local hosting adapter routes. No crawlable content was hidden from all visitors or discarded.
- Full automated suite: 575 tests across 88 files. TypeScript passes; targeted lint has zero errors and the unchanged App fast-refresh export warning.

Publication is a separate step. A successful local build or Lovable preview does not establish a public-site rollout.
