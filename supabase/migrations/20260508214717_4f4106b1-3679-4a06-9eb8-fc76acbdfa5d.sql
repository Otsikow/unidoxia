-- Allow analytics_events to be created and ensure usage monitoring works
ALTER TABLE public.analytics_events ALTER COLUMN tenant_id DROP NOT NULL;

-- INSERT policy for authenticated users (must insert their own user_id)
DROP POLICY IF EXISTS analytics_events_insert_authenticated ON public.analytics_events;
CREATE POLICY analytics_events_insert_authenticated
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- INSERT policy for anonymous visitors (no user_id)
DROP POLICY IF EXISTS analytics_events_insert_anon ON public.analytics_events;
CREATE POLICY analytics_events_insert_anon
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Ensure authenticated users can read their own events (in addition to staff)
DROP POLICY IF EXISTS analytics_events_select_own ON public.analytics_events;
CREATE POLICY analytics_events_select_own
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());