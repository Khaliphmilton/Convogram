-- Convogram runtime repair: make the core posting/profile flows actually usable.
-- Idempotent. Run in Supabase SQL Editor if migrations are not automatically applied.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core interaction tables used by the client.
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT likes_unique UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT follows_unique UNIQUE(follower_id, following_id),
  CONSTRAINT follows_not_self CHECK(follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS public.moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'image',
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moment_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT moment_views_unique UNIQUE(moment_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT post_tags_unique UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON public.comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_moments_active ON public.moments(expires_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_user ON public.moments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moment_views_moment ON public.moment_views(moment_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_tags_user ON public.post_tags(user_id, created_at DESC);

-- Ensure the profile columns required by Edit Profile exist.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website VARCHAR(512);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Automatically create profiles for new accounts and backfill existing accounts.
CREATE OR REPLACE FUNCTION public.handle_new_convogram_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles(id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(LOWER(NEW.raw_user_meta_data->>'username'), ''), 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 12)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), 'Convogram User')
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    username = CASE WHEN public.profiles.username IS NULL OR public.profiles.username = '' THEN EXCLUDED.username ELSE public.profiles.username END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_convogram ON auth.users;
CREATE TRIGGER on_auth_user_created_convogram
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_convogram_user();

INSERT INTO public.profiles(id, username, display_name)
SELECT
  u.id,
  COALESCE(NULLIF(LOWER(u.raw_user_meta_data->>'username'), ''), 'user_' || substr(replace(u.id::text, '-', ''), 1, 12)),
  COALESCE(NULLIF(u.raw_user_meta_data->>'display_name', ''), 'Convogram User')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- RLS for the posting/social flows.
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS likes_read ON public.likes;
DROP POLICY IF EXISTS likes_own_write ON public.likes;
CREATE POLICY likes_read ON public.likes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY likes_own_write ON public.likes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS comments_read ON public.comments;
DROP POLICY IF EXISTS comments_own_write ON public.comments;
CREATE POLICY comments_read ON public.comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY comments_own_write ON public.comments FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS follows_read ON public.follows;
DROP POLICY IF EXISTS follows_own_write ON public.follows;
CREATE POLICY follows_read ON public.follows FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY follows_own_write ON public.follows FOR ALL USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS moments_read ON public.moments;
DROP POLICY IF EXISTS moments_own_write ON public.moments;
CREATE POLICY moments_read ON public.moments FOR SELECT USING (auth.uid() IS NOT NULL AND expires_at > NOW());
CREATE POLICY moments_own_write ON public.moments FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS moment_views_read ON public.moment_views;
DROP POLICY IF EXISTS moment_views_own_write ON public.moment_views;
CREATE POLICY moment_views_read ON public.moment_views FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY moment_views_own_write ON public.moment_views FOR INSERT WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS post_tags_read ON public.post_tags;
DROP POLICY IF EXISTS post_tags_own_write ON public.post_tags;
CREATE POLICY post_tags_read ON public.post_tags FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY post_tags_own_write ON public.post_tags FOR ALL USING (tagged_by = auth.uid()) WITH CHECK (tagged_by = auth.uid());

-- One public bucket is used consistently by the web client for posts, moments and avatars.
INSERT INTO storage.buckets(id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS convogram_storage_read ON storage.objects;
DROP POLICY IF EXISTS convogram_storage_insert ON storage.objects;
DROP POLICY IF EXISTS convogram_storage_update ON storage.objects;
DROP POLICY IF EXISTS convogram_storage_delete ON storage.objects;
CREATE POLICY convogram_storage_read ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY convogram_storage_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-media' AND auth.uid() IS NOT NULL);
CREATE POLICY convogram_storage_update ON storage.objects FOR UPDATE USING (bucket_id = 'post-media' AND owner_id = auth.uid());
CREATE POLICY convogram_storage_delete ON storage.objects FOR DELETE USING (bucket_id = 'post-media' AND owner_id = auth.uid());
