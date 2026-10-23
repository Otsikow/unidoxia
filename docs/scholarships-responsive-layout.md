# Scholarships responsive layout

23 October 2026

## Change

The scholarships listing retains the existing theme, data, filters, saving, alerts, sharing and AI actions. The desktop layout uses a 240px filter panel and a flexible results column within a 1280px maximum width. Mobile filters have an accessible Show/Hide button. AI search and profile matching use keyboard-operable expandable sections so results are easier to reach. Notice actions stack on small screens. Scholarship headings have a full row, and card actions wrap rather than overflowing. Search and profile selectors have accessible labels.

## Verification

- Existing automated suite: 49 files, 376 tests passed.
- Changed-file ESLint and whitespace validation passed.
- Browser layout checks at 320, 375, 768, 1024 and 1440 pixels: no document overflow with filters and profile finder expanded; country popovers remain inside the viewport.
- Layout checks stub Supabase responses to avoid production changes. They establish layout and control behaviour, not live scholarship accuracy or backend matching results.
- Final production build and existing sitemap/SEO verification passed (1538 sitemap URLs).
- Saved Playwright regression suite: all five viewport tests passed.

## Release boundary

Deliver through GitHub main to Lovable project 85578b91-45ce-4a22-b275-f732009d9503. Publishing remains a manual step for Eric. No database or scholarship content changes are included.

Eric explicitly authorised pull-request creation and merge after reviewing the local completion report. Deliver this change to Otsikow/unidoxia through the normal checks; verify the merge and Lovable sync separately. Live publication remains a manual step.
