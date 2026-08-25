CREATE OR REPLACE FUNCTION public.search_programmes(p_query text DEFAULT ''::text, p_country text DEFAULT NULL::text, p_level text DEFAULT NULL::text, p_intake_year integer DEFAULT NULL::integer, p_intake_month integer DEFAULT NULL::integer, p_limit integer DEFAULT 24, p_offset integer DEFAULT 0, p_university_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, university_id uuid, name text, level text, discipline text, qualification text, duration_months integer, tuition_amount numeric, tuition_currency text, intake_months integer[], university_name text, university_slug text, university_city text, university_country text, university_logo_url text, rank_score double precision, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
WITH query AS (SELECT public.normalize_catalogue_search(p_query) AS normalized),
tokens AS (SELECT token FROM query, regexp_split_to_table(normalized, '\s+') token WHERE token <> ''),
eligible AS (
  SELECT p.*, u.name AS university_name, u.slug AS university_slug, u.city AS university_city,
    u.country AS university_country, u.logo_url AS university_logo_url,
    public.normalize_catalogue_search(p.name) AS normalized_name,
    public.normalize_catalogue_search(p.discipline) AS normalized_discipline,
    public.normalize_catalogue_search(coalesce(p.qualification,'')) AS normalized_qualification,
    public.normalize_catalogue_search(u.name) AS normalized_university,
    public.normalize_catalogue_search(u.city) AS normalized_city,
    public.normalize_catalogue_search(u.country) AS normalized_country
  FROM public.programs p JOIN public.universities u ON u.id = p.university_id
  WHERE p.active AND p.catalogue_status = 'active' AND u.active
    AND (p_university_id IS NULL OR p.university_id = p_university_id)
    AND (p_country IS NULL OR p_country = '' OR p_country = 'all' OR public.normalize_catalogue_search(u.country) = public.normalize_catalogue_search(p_country))
    AND (p_level IS NULL OR p_level = '' OR p_level = 'all' OR lower(p.level) = lower(p_level))
    AND (p_intake_year IS NULL OR EXISTS (SELECT 1 FROM public.program_intakes pi WHERE pi.program_id=p.id AND pi.intake_year=p_intake_year AND (p_intake_month IS NULL OR pi.intake_month=p_intake_month) AND pi.status IN ('available','recruitable')))
), ranked AS (
  SELECT e.*,
    CASE WHEN q.normalized = '' THEN 1.0
      WHEN e.normalized_name = q.normalized THEN 100.0
      WHEN e.normalized_name LIKE q.normalized || '%' THEN 90.0
      WHEN e.normalized_university = q.normalized THEN 85.0
      WHEN EXISTS (SELECT 1 FROM public.university_search_aliases a WHERE a.university_id=e.university_id AND a.normalized_alias=q.normalized) THEN 82.0
      ELSE 0.0 END
    + extensions.similarity(e.normalized_name, q.normalized) * 40
    + extensions.similarity(e.normalized_university, q.normalized) * 30
    + extensions.similarity(e.normalized_discipline, q.normalized) * 25 AS score
  FROM eligible e CROSS JOIN query q
  WHERE q.normalized = '' OR NOT EXISTS (
    SELECT 1 FROM tokens t WHERE NOT (
      e.normalized_name % t.token OR e.normalized_name LIKE '%'||t.token||'%'
      OR e.normalized_discipline % t.token OR e.normalized_discipline LIKE '%'||t.token||'%'
      OR e.normalized_qualification LIKE '%'||t.token||'%'
      OR e.normalized_university % t.token OR e.normalized_university LIKE '%'||t.token||'%'
      OR e.normalized_city LIKE '%'||t.token||'%' OR e.normalized_country LIKE '%'||t.token||'%'
      OR EXISTS (SELECT 1 FROM public.university_search_aliases a WHERE a.university_id=e.university_id AND (a.normalized_alias=t.token OR a.normalized_alias % t.token))
    )
  )
)
SELECT r.id, r.university_id, r.name, r.level, r.discipline, r.qualification,
  r.duration_months, r.tuition_amount, r.tuition_currency,
  coalesce(r.intake_months, (SELECT array_agg(DISTINCT pi.intake_month ORDER BY pi.intake_month) FROM public.program_intakes pi WHERE pi.program_id = r.id AND pi.status IN ('available','recruitable'))) AS intake_months,
  r.university_name, r.university_slug, r.university_city, r.university_country, r.university_logo_url,
  r.score, count(*) OVER() AS total_count
FROM ranked r ORDER BY r.score DESC, r.name ASC LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0);
$function$;

GRANT EXECUTE ON FUNCTION public.search_programmes(text, text, text, integer, integer, integer, integer, uuid) TO anon, authenticated, service_role;