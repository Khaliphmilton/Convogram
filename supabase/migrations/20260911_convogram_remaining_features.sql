-- Remaining platform foundations: message expiry, creator earnings, notification devices, livestreams.
-- Safe to rerun.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'open';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_reports_status_created_at ON reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS creator_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL DEFAULT 'tip',
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT creator_earnings_source_check CHECK (source IN ('tip','subscription','content','livestream','other')),
  CONSTRAINT creator_earnings_status_check CHECK (status IN ('pending','available','paid','cancelled')),
  CONSTRAINT creator_earnings_amount_check CHECK (amount_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_user_created ON creator_earnings(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  platform VARCHAR(30) DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT notification_devices_unique_endpoint UNIQUE(endpoint)
);
CREATE INDEX IF NOT EXISTS idx_notification_devices_user ON notification_devices(user_id);

CREATE TABLE IF NOT EXISTS livestreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  room_key VARCHAR(255),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT livestream_status_check CHECK (status IN ('scheduled','live','ended','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_livestreams_host_created ON livestreams(host_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_livestreams_status_created ON livestreams(status, created_at DESC);

CREATE TABLE IF NOT EXISTS livestream_viewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  livestream_id UUID NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  CONSTRAINT livestream_viewer_unique UNIQUE(livestream_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_livestream_viewers_stream ON livestream_viewers(livestream_id);

ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestream_viewers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_earnings_select_own ON creator_earnings;
CREATE POLICY creator_earnings_select_own ON creator_earnings FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS notification_devices_manage_own ON notification_devices;
CREATE POLICY notification_devices_manage_own ON notification_devices FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS livestreams_public_read ON livestreams;
CREATE POLICY livestreams_public_read ON livestreams FOR SELECT USING (status IN ('scheduled','live','ended') OR host_id = auth.uid());
DROP POLICY IF EXISTS livestreams_host_write ON livestreams;
CREATE POLICY livestreams_host_write ON livestreams FOR ALL USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());
DROP POLICY IF EXISTS livestream_viewers_read ON livestream_viewers;
CREATE POLICY livestream_viewers_read ON livestream_viewers FOR SELECT USING (EXISTS (SELECT 1 FROM livestreams l WHERE l.id = livestream_id AND (l.host_id = auth.uid() OR user_id = auth.uid())));
DROP POLICY IF EXISTS livestream_viewers_manage_own ON livestream_viewers;
CREATE POLICY livestream_viewers_manage_own ON livestream_viewers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY livestream_viewers_update_own ON livestream_viewers FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
