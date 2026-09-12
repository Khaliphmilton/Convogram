-- Convogram community repair: guarantees the tables used by the community UI exist.
-- Safe to rerun. Also asks PostgREST to refresh its schema cache.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_community_membership UNIQUE (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT community_post_media_type CHECK (media_type IS NULL OR media_type IN ('image','video','file'))
);

CREATE INDEX IF NOT EXISTS idx_communities_owner_created ON public.communities(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_community_created ON public.community_posts(community_id, created_at DESC);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Convogram communities read" ON public.communities;
CREATE POLICY "Convogram communities read" ON public.communities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Convogram communities insert" ON public.communities;
CREATE POLICY "Convogram communities insert" ON public.communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Convogram communities update owner" ON public.communities;
CREATE POLICY "Convogram communities update owner" ON public.communities FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Convogram communities delete owner" ON public.communities;
CREATE POLICY "Convogram communities delete owner" ON public.communities FOR DELETE TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Convogram community members read" ON public.community_members;
CREATE POLICY "Convogram community members read" ON public.community_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Convogram community members insert" ON public.community_members;
CREATE POLICY "Convogram community members insert" ON public.community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Convogram community members delete own" ON public.community_members;
CREATE POLICY "Convogram community members delete own" ON public.community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Convogram community posts read" ON public.community_posts;
CREATE POLICY "Convogram community posts read" ON public.community_posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Convogram community posts insert" ON public.community_posts;
CREATE POLICY "Convogram community posts insert" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Convogram community posts update own" ON public.community_posts;
CREATE POLICY "Convogram community posts update own" ON public.community_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Convogram community posts delete own" ON public.community_posts;
CREATE POLICY "Convogram community posts delete own" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
