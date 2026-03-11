-- Create image_storage_analytics table
CREATE TABLE image_storage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL,
  total_size_bytes BIGINT NOT NULL,
  file_count INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_storage_community_date ON image_storage_analytics(community_id, recorded_at DESC);
CREATE INDEX idx_storage_bucket ON image_storage_analytics(bucket_name);

-- Enable RLS
ALTER TABLE image_storage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view their community's storage
CREATE POLICY "Admins can view storage analytics"
  ON image_storage_analytics
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = image_storage_analytics.community_id)
         OR is_super_admin = true
    )
  );

-- Comment
COMMENT ON TABLE image_storage_analytics IS 'Stores daily snapshots of storage usage per community and bucket';
