-- Convogram production hardening migration
-- Safe to run after the base schema. Keeps client-side access scoped to the signed-in user.

-- Presence has nullable conversation_id, so a normal UNIQUE constraint allows
-- multiple global presence rows. Keep one global row per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_presence_global_user_unique
  ON presence(user_id)
  WHERE conversation_id IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_blocked" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_insert_blocked" ON notifications
  FOR INSERT WITH CHECK (FALSE);

ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presence_select_members" ON presence;
DROP POLICY IF EXISTS "presence_insert_own" ON presence;
DROP POLICY IF EXISTS "presence_update_own" ON presence;
DROP POLICY IF EXISTS "presence_delete_own" ON presence;
CREATE POLICY "presence_select_members" ON presence
  FOR SELECT USING (user_id = auth.uid() OR conversation_id IS NULL);
CREATE POLICY "presence_insert_own" ON presence
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence_update_own" ON presence
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "presence_delete_own" ON presence
  FOR DELETE USING (user_id = auth.uid());

-- Realtime is required for chat/call/presence experiences. The DO blocks make
-- the migration rerunnable when a table is already in the publication.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_desc
  ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_community_created
  ON community_posts(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_likes_short_user
  ON short_likes(short_id, user_id);
