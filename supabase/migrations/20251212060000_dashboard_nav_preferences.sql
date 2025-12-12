-- Per-user dashboard navigation ordering preferences (persisted across devices)

CREATE TABLE IF NOT EXISTS public.dashboard_nav_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL,
  item_order TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, menu_key)
);

ALTER TABLE public.dashboard_nav_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dashboard nav preferences"
  ON public.dashboard_nav_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard nav preferences"
  ON public.dashboard_nav_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard nav preferences"
  ON public.dashboard_nav_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard nav preferences"
  ON public.dashboard_nav_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_nav_preferences_user_key
  ON public.dashboard_nav_preferences(user_id, menu_key);

CREATE TRIGGER update_dashboard_nav_preferences_updated_at
  BEFORE UPDATE ON public.dashboard_nav_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

