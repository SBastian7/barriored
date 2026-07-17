-- Create push_notification_logs table
CREATE TABLE push_notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES community_alerts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  test_mode BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notif_logs_community_date ON push_notification_logs(community_id, sent_at DESC);
CREATE INDEX idx_notif_logs_alert ON push_notification_logs(alert_id);

-- Enable RLS
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view logs
CREATE POLICY "Admins can view notification logs"
  ON push_notification_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = push_notification_logs.community_id)
         OR is_super_admin = true
    )
  );

-- Comment
COMMENT ON TABLE push_notification_logs IS 'Logs all push notification sends for statistics and debugging';
