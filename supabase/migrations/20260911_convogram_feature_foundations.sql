-- Convogram feature foundations: privacy, moderation and creator-ready metadata.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.touch_profile_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET last_seen_at = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_convogram_profile_last_seen ON public.presence;
CREATE TRIGGER trg_convogram_profile_last_seen
AFTER INSERT OR UPDATE ON public.presence
FOR EACH ROW EXECUTE FUNCTION public.touch_profile_last_seen();

-- Ensure report states support moderation workflows when the base schema is present.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
