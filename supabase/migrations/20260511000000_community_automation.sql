-- Track which event posts have already received reminder push notifications
-- UNIQUE(post_id, type) is the deduplication guarantee at DB level
CREATE TABLE cron_reminder_logs (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  type    text NOT NULL CHECK (type IN ('24h', '1h')),
  sent_at timestamptz DEFAULT now(),
  UNIQUE(post_id, type)
);

-- Allow RLS bypass for cron (service role reads/writes this table)
ALTER TABLE cron_reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON cron_reminder_logs
  USING (true) WITH CHECK (true);

-- Community post reports (was referenced in RLS policies but never created)
CREATE TABLE community_reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id         uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  reporter_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_entity_id   uuid NOT NULL,
  reported_entity_type text NOT NULL CHECK (reported_entity_type IN ('post', 'review', 'business')),
  reason               text NOT NULL,
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create reports
CREATE POLICY "Users can insert reports" ON community_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can see their own reports
CREATE POLICY "Users can view own reports" ON community_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can view and update reports in their community
CREATE POLICY "Admins can manage community reports" ON community_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (is_super_admin = true OR (role = 'admin' AND community_id = community_reports.community_id))
    )
  );

CREATE INDEX idx_community_reports_entity ON community_reports(reported_entity_id, reported_entity_type);
CREATE INDEX idx_community_reports_status ON community_reports(status) WHERE status = 'pending';

-- Soft-flag column for posts that hit exactly 1 keyword (admin review queue)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS moderation_flag boolean DEFAULT false;
CREATE INDEX idx_community_posts_moderation_flag ON community_posts(moderation_flag) WHERE moderation_flag = true;
