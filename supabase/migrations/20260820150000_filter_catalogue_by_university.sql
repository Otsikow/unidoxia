-- Add an exact university filter to the public catalogue search while preserving
-- the existing course/university keyword search and truthful grouped totals.
DROP FUNCTION IF EXISTS public.search_programmes(TEXT,TEXT,TEXT,INTEGER,INTEGER,INTEGER,INTEGER);
DROP FUNCTION IF EXISTS public.search_programmes(TEXT,UUID,TEXT,TEXT,INTEGER,INTEGER,INTEGER,INTEGER);

CREATE FUNCTION public.search_programmes(
  p_query TEXT DEFAULT '', p_university_id UUID DEFAULT NULL,
  p_country TEXT DEFAULT NULL, p_level TEXT DEFAULT NULL,
  p_intake_year INTEGER DEFAULT NULL, p_intake_month INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 24, p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID, university_id UUID, name TEXT, level TEXT, discipline TEXT, qualification TEXT,
  duration_months INTEGER, tuition_amount NUMERIC, tuition_currency TEXT,
  university_name TEXT, university_slug TEXT, university_city TEXT, university_country TEXT,
  university_logo_url TEXT, next_intake_year INTEGER, next_intake_month INTEGER,
  rank_score DOUBLE PRECISION, university_match_count BIGINT, university_count BIGINT, total_count BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
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
    AND (p_university_id IS NULL OR u.id = p_university_id)
    AND (p_country IS NULL OR p_country = '' OR p_country = 'all' OR public.normalize_catalogue_search(u.country) = public.normalize_catalogue_search(p_country))
    AND (p_level IS NULL OR p_level = '' OR p_level = 'all' OR lower(p.level) = lower(p_level))
    AND (p_intake_year IS NULL OR EXISTS (SELECT 1 FROM public.program_intakes pi WHERE pi.program_id=p.id AND pi.intake_year=p_intake_year AND (p_intake_month IS NULL OR pi.intake_month=p_intake_month) AND pi.status IN ('available','recruitable')))
), ranked AS (
  SELECT e.*, CASE WHEN q.normalized = '' THEN 1.0 WHEN e.normalized_name = q.normalized THEN 100.0
      WHEN e.normalized_name LIKE q.normalized || '%' THEN 90.0 WHEN e.normalized_university = q.normalized THEN 85.0
      WHEN EXISTS (SELECT 1 FROM public.university_search_aliases a WHERE a.university_id=e.university_id AND a.normalized_alias=q.normalized) THEN 82.0 ELSE 0.0 END
    + extensions.similarity(e.normalized_name, q.normalized) * 40
    + extensions.similarity(e.normalized_university, q.normalized) * 30
    + extensions.similarity(e.normalized_discipline, q.normalized) * 25 AS score
  FROM eligible e CROSS JOIN query q
  WHERE q.normalized = '' OR NOT EXISTS (SELECT 1 FROM tokens t WHERE NOT (
    e.normalized_name % t.token OR e.normalized_name LIKE '%'||t.token||'%' OR e.normalized_discipline % t.token
    OR e.normalized_discipline LIKE '%'||t.token||'%' OR e.normalized_qualification LIKE '%'||t.token||'%'
    OR e.normalized_university % t.token OR e.normalized_university LIKE '%'||t.token||'%'
    OR e.normalized_city LIKE '%'||t.token||'%' OR e.normalized_country LIKE '%'||t.token||'%'
    OR EXISTS (SELECT 1 FROM public.university_search_aliases a WHERE a.university_id=e.university_id AND (a.normalized_alias=t.token OR a.normalized_alias % t.token))
  ))
), totals AS (SELECT count(*) AS total_count, count(DISTINCT university_id) AS university_count FROM ranked)
SELECT r.id, r.university_id, r.name, r.level, r.discipline, r.qualification, r.duration_months,
  r.tuition_amount, r.tuition_currency, r.university_name, r.university_slug, r.university_city,
  r.university_country, r.university_logo_url, ni.intake_year, ni.intake_month, r.score,
  count(*) OVER (PARTITION BY r.university_id), totals.university_count, totals.total_count
FROM ranked r CROSS JOIN totals
LEFT JOIN LATERAL (SELECT pi.intake_year, pi.intake_month FROM public.program_intakes pi
  WHERE pi.program_id=r.id AND pi.status IN ('available','recruitable') AND pi.intake_year >= 2027
  ORDER BY pi.intake_year, pi.intake_month LIMIT 1) ni ON true
ORDER BY r.score DESC, r.name ASC LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0);
$$;

GRANT EXECUTE ON FUNCTION public.search_programmes(TEXT,UUID,TEXT,TEXT,INTEGER,INTEGER,INTEGER,INTEGER) TO anon, authenticated;
