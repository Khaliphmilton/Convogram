-- Real profile persistence for Saved, Tagged and profile settings.
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_saved_post UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id);

CREATE TABLE IF NOT EXISTS post_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_post_tag UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_user_id ON post_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their saved posts" ON saved_posts;
CREATE POLICY "Users can read their saved posts" ON saved_posts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can save posts" ON saved_posts;
CREATE POLICY "Users can save posts" ON saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unsave posts" ON saved_posts;
CREATE POLICY "Users can unsave posts" ON saved_posts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read tags involving them" ON post_tags;
CREATE POLICY "Users can read tags involving them" ON post_tags FOR SELECT USING (auth.uid() = user_id OR auth.uid() = tagged_by);
DROP POLICY IF EXISTS "Users can create tags" ON post_tags;
CREATE POLICY "Users can create tags" ON post_tags FOR INSERT WITH CHECK (auth.uid() = tagged_by);
DROP POLICY IF EXISTS "Users can remove their tags" ON post_tags;
CREATE POLICY "Users can remove their tags" ON post_tags FOR DELETE USING (auth.uid() = user_id OR auth.uid() = tagged_by);
