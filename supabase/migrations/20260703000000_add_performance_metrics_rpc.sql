-- Create RPC function to calculate agent performance metrics
CREATE OR REPLACE FUNCTION get_agent_performance_metrics(
  target_agent_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  resolved_agent_id UUID;
  result JSON;
BEGIN
  -- Resolve agent ID
  IF target_agent_id IS NOT NULL THEN
    resolved_agent_id := target_agent_id;
  ELSE
    SELECT id INTO resolved_agent_id FROM agents WHERE profile_id = auth.uid();
  END IF;

  -- If still null (e.g. user is not an agent and didn't provide ID), return empty structure
  IF resolved_agent_id IS NULL THEN
     RETURN json_build_object(
       'overall', json_build_object(
         'total_applications', 0,
         'avg_time_to_offer', 0,
         'offer_acceptance_rate', 0,
         'visa_success_rate', 0
       ),
       'funnel', '[]'::json,
       'universities', '[]'::json,
       'student_profiles', '[]'::json
     );
  END IF;

  WITH app_stats AS (
    SELECT
      a.id,
      a.status,
      a.submitted_at,
      o.created_at as offer_created_at,
      o.accepted as offer_accepted,
      u.name as university_name,
      u.id as university_id,
      s.nationality as student_nationality
    FROM applications a
    LEFT JOIN offers o ON a.id = o.application_id
    LEFT JOIN programs p ON a.program_id = p.id
    LEFT JOIN universities u ON p.university_id = u.id
    LEFT JOIN students s ON a.student_id = s.id
    WHERE a.agent_id = resolved_agent_id
    AND a.submitted_at IS NOT NULL
  ),
  overall_metrics AS (
    SELECT
      COUNT(*) as total_applications,
      COALESCE(AVG(EXTRACT(EPOCH FROM (offer_created_at - submitted_at))/86400)::NUMERIC(10,1), 0) as avg_time_to_offer,
      COALESCE((COUNT(CASE WHEN offer_accepted THEN 1 END)::NUMERIC / NULLIF(COUNT(offer_created_at), 0) * 100)::NUMERIC(10,1), 0) as offer_acceptance_rate,
      COALESCE((COUNT(CASE WHEN status = 'enrolled' THEN 1 END)::NUMERIC / NULLIF(COUNT(CASE WHEN status IN ('cas_loa', 'visa', 'enrolled') THEN 1 END), 0) * 100)::NUMERIC(10,1), 0) as visa_success_rate
    FROM app_stats
  ),
  status_counts AS (
    SELECT status, COUNT(*) as count
    FROM app_stats
    GROUP BY status
    ORDER BY count DESC
  ),
  university_metrics AS (
    SELECT
      university_id,
      university_name,
      COUNT(*) as application_count,
      COALESCE(AVG(EXTRACT(EPOCH FROM (offer_created_at - submitted_at))/86400)::NUMERIC(10,1), 0) as avg_time_to_offer,
      COALESCE((COUNT(CASE WHEN offer_accepted THEN 1 END)::NUMERIC / NULLIF(COUNT(offer_created_at), 0) * 100)::NUMERIC(10,1), 0) as acceptance_rate
    FROM app_stats
    GROUP BY university_id, university_name
    HAVING COUNT(*) > 0
    ORDER BY avg_time_to_offer DESC
  ),
  nationality_metrics AS (
    SELECT
      student_nationality,
      COUNT(*) as application_count,
      COALESCE((COUNT(CASE WHEN status = 'enrolled' THEN 1 END)::NUMERIC / NULLIF(COUNT(CASE WHEN status IN ('cas_loa', 'visa', 'enrolled') THEN 1 END), 0) * 100)::NUMERIC(10,1), 0) as visa_success_rate
    FROM app_stats
    WHERE student_nationality IS NOT NULL
    GROUP BY student_nationality
    HAVING COUNT(CASE WHEN status IN ('cas_loa', 'visa', 'enrolled') THEN 1 END) > 0
    ORDER BY visa_success_rate DESC
  )
  SELECT json_build_object(
    'overall', (SELECT row_to_json(om) FROM overall_metrics om),
    'funnel', (SELECT json_agg(row_to_json(sc)) FROM status_counts sc),
    'universities', COALESCE((SELECT json_agg(row_to_json(um)) FROM university_metrics um), '[]'::json),
    'student_profiles', COALESCE((SELECT json_agg(row_to_json(nm)) FROM nationality_metrics nm), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;
