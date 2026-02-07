-- Public landing page metrics for AI executive dashboard cards
CREATE OR REPLACE FUNCTION public.get_public_ai_executive_metrics()
RETURNS TABLE (
  applications_this_week bigint,
  applications_vs_last_week_percent integer,
  conversion_rate_percent integer,
  conversion_delta_points integer,
  best_performing_agents text,
  countries_with_most_leads text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH week_windows AS (
  SELECT
    date_trunc('week', timezone('utc', now())) AS current_week_start,
    date_trunc('week', timezone('utc', now())) - interval '7 days' AS previous_week_start
),
weekly_counts AS (
  SELECT
    COUNT(*) FILTER (
      WHERE a.created_at >= ww.current_week_start
        AND a.created_at < ww.current_week_start + interval '7 days'
    )::bigint AS this_week,
    COUNT(*) FILTER (
      WHERE a.created_at >= ww.previous_week_start
        AND a.created_at < ww.current_week_start
    )::bigint AS last_week
  FROM public.applications a
  CROSS JOIN week_windows ww
),
conversion_stats AS (
  SELECT
    COUNT(a.id)::bigint AS total_applications,
    COUNT(o.id)::bigint AS offers_issued
  FROM public.applications a
  LEFT JOIN public.offers o ON o.application_id = a.id
),
agent_performance AS (
  SELECT
    COALESCE(p.full_name, ag.company_name, 'Unknown') AS agent_name,
    COUNT(a.id) AS application_count
  FROM public.applications a
  LEFT JOIN public.agents ag ON ag.id = a.agent_id
  LEFT JOIN public.profiles p ON p.id = ag.profile_id
  WHERE a.created_at >= (SELECT current_week_start FROM week_windows)
    AND a.created_at < (SELECT current_week_start + interval '7 days' FROM week_windows)
  GROUP BY COALESCE(p.full_name, ag.company_name, 'Unknown')
  ORDER BY application_count DESC, agent_name ASC
  LIMIT 3
),
lead_countries AS (
  SELECT
    COALESCE(NULLIF(trim(st.current_country), ''), NULLIF(trim(st.nationality), ''), 'Unknown') AS country_name,
    COUNT(a.id) AS lead_count
  FROM public.applications a
  JOIN public.students st ON st.id = a.student_id
  WHERE a.created_at >= (SELECT current_week_start FROM week_windows)
    AND a.created_at < (SELECT current_week_start + interval '7 days' FROM week_windows)
  GROUP BY COALESCE(NULLIF(trim(st.current_country), ''), NULLIF(trim(st.nationality), ''), 'Unknown')
  ORDER BY lead_count DESC, country_name ASC
  LIMIT 3
)
SELECT
  wc.this_week AS applications_this_week,
  CASE
    WHEN wc.last_week = 0 THEN CASE WHEN wc.this_week > 0 THEN 100 ELSE 0 END
    ELSE ROUND(((wc.this_week - wc.last_week)::numeric / wc.last_week::numeric) * 100)::integer
  END AS applications_vs_last_week_percent,
  CASE
    WHEN cs.total_applications = 0 THEN 0
    ELSE ROUND((cs.offers_issued::numeric / cs.total_applications::numeric) * 100)::integer
  END AS conversion_rate_percent,
  CASE
    WHEN cs.total_applications = 0 THEN 0
    ELSE ROUND((cs.offers_issued::numeric / cs.total_applications::numeric) * 100)::integer - 36
  END AS conversion_delta_points,
  COALESCE((SELECT string_agg(ap.agent_name, ' · ' ORDER BY ap.application_count DESC, ap.agent_name ASC) FROM agent_performance ap), 'No data yet') AS best_performing_agents,
  COALESCE((SELECT string_agg(initcap(lc.country_name), ' · ' ORDER BY lc.lead_count DESC, lc.country_name ASC) FROM lead_countries lc), 'No data yet') AS countries_with_most_leads
FROM weekly_counts wc
CROSS JOIN conversion_stats cs;
$$;

COMMENT ON FUNCTION public.get_public_ai_executive_metrics() IS
  'Returns live public metrics for the landing page AI executive dashboard cards.';

GRANT EXECUTE ON FUNCTION public.get_public_ai_executive_metrics() TO anon, authenticated;
