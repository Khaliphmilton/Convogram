-- Convogram platform performance/search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'open';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_communities_name_trgm ON public.communities USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_caption_trgm ON public.posts USING gin (caption gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_short_comments_short_created ON public.short_comments(short_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_likes_user_short ON public.short_likes(user_id, short_id);
CREATE INDEX IF NOT EXISTS idx_follows_user_following ON public.follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_user ON public.follows(following_id, follower_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked ON public.blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_call ON public.call_participants(user_id, call_session_id);
