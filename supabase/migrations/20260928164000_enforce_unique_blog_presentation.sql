-- Each blog post needs an original cover and a distinct editorial angle.
-- Repair the known 18 September repeated cover and generic weekly-roundup hook
-- before enforcing new writes. The updated copy is grounded in the existing
-- source-checked article: the Canada exemption applies to eligible existing
-- work-permit holders, not new overseas student applicants.
UPDATE public.blog_posts
SET
  cover_image_url = '/blog/2026-09-18-international-student-visa-updates-cover.png',
  title = 'Canada’s 6-Month Study Exemption: Who It Actually Helps',
  excerpt = 'Already working in Canada? A temporary policy may let eligible work permit holders take a course of six months or less without a study permit. It is not a route for new overseas students.',
  content_md = REGEXP_REPLACE(
    content_md,
    E'^# [^\\n]*',
    '# Canada’s 6-Month Study Exemption: Who It Actually Helps'
  ),
  seo_title = 'Canada’s 6-Month Study Exemption: Who It Actually Helps | UniDoxia',
  seo_description = 'Who can use Canada’s temporary short-study exemption? Source-checked guidance for eligible work permit holders and overseas students.'
WHERE id = '30133fce-49a3-4340-b362-684443a33376'
  AND title = 'International Student Visa & Study Policy Updates: Week Ending 18 September 2026'
  AND cover_image_url = '/blog/2026-09-04-international-student-visa-updates-cover.png';

CREATE OR REPLACE FUNCTION public.prevent_duplicate_blog_presentation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published'
     AND NULLIF(BTRIM(NEW.cover_image_url), '') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.blog_posts AS existing
       WHERE existing.tenant_id = NEW.tenant_id
         AND existing.id IS DISTINCT FROM NEW.id
         AND LOWER(BTRIM(existing.cover_image_url)) = LOWER(BTRIM(NEW.cover_image_url))
     ) THEN
    RAISE EXCEPTION 'A blog post already uses this cover image. Choose an original cover.';
  END IF;

  IF NEW.status = 'published'
     AND NULLIF(BTRIM(NEW.title), '') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.blog_posts AS existing
       WHERE existing.tenant_id = NEW.tenant_id
         AND existing.id IS DISTINCT FROM NEW.id
         AND LOWER(REGEXP_REPLACE(BTRIM(existing.title), E'\\s+', ' ', 'g')) =
             LOWER(REGEXP_REPLACE(BTRIM(NEW.title), E'\\s+', ' ', 'g'))
     ) THEN
    RAISE EXCEPTION 'A blog post already uses this title. Choose a distinct editorial angle.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_blog_presentation ON public.blog_posts;

CREATE TRIGGER trg_prevent_duplicate_blog_presentation
BEFORE INSERT OR UPDATE OF title, cover_image_url, status ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_blog_presentation();
