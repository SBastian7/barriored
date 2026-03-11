-- Create push_notification_config table
CREATE TABLE push_notification_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID UNIQUE NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  max_per_day INTEGER DEFAULT 10,
  test_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_push_config_community ON push_notification_config(community_id);

-- Enable RLS
ALTER TABLE push_notification_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Admins can manage push config"
  ON push_notification_config
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = push_notification_config.community_id)
         OR is_super_admin = true
    )
  );

-- Comment
COMMENT ON TABLE push_notification_config IS 'Per-community push notification configuration and rate limits';
