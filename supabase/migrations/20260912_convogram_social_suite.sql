-- Free Convogram social suite. No payments, subscriptions, or monetization tables.
-- Safe to rerun.

CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT saved_posts_unique UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_created ON saved_posts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT reposts_unique UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_reposts_post_created ON reposts(post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT poll_votes_unique UNIQUE(poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id, position);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content VARCHAR(280) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_user_expires ON notes(user_id, expires_at DESC);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_messages_expiry ON messages(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_posts_own ON saved_posts;
CREATE POLICY saved_posts_own ON saved_posts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS reposts_public_read ON reposts;
CREATE POLICY reposts_public_read ON reposts FOR SELECT USING (true);
DROP POLICY IF EXISTS reposts_own_write ON reposts;
CREATE POLICY reposts_own_write ON reposts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS polls_public_read ON polls;
CREATE POLICY polls_public_read ON polls FOR SELECT USING (true);
DROP POLICY IF EXISTS polls_post_owner_write ON polls;
CREATE POLICY polls_post_owner_write ON polls FOR ALL USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS poll_options_public_read ON poll_options;
CREATE POLICY poll_options_public_read ON poll_options FOR SELECT USING (true);
DROP POLICY IF EXISTS poll_options_owner_write ON poll_options;
CREATE POLICY poll_options_owner_write ON poll_options FOR ALL USING (EXISTS (SELECT 1 FROM polls po JOIN posts p ON p.id = po.post_id WHERE po.id = poll_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM polls po JOIN posts p ON p.id = po.post_id WHERE po.id = poll_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS poll_votes_read ON poll_votes;
CREATE POLICY poll_votes_read ON poll_votes FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS poll_votes_own_write ON poll_votes;
CREATE POLICY poll_votes_own_write ON poll_votes FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS notes_public_read ON notes;
CREATE POLICY notes_public_read ON notes FOR SELECT USING (expires_at > NOW());
DROP POLICY IF EXISTS notes_own_write ON notes;
CREATE POLICY notes_own_write ON notes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
