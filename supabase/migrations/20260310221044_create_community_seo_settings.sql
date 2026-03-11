-- Create community_seo_settings table
CREATE TABLE community_seo_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID UNIQUE NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_seo_community ON community_seo_settings(community_id);

-- Enable RLS
ALTER TABLE community_seo_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage their community's SEO
CREATE POLICY "Community admins can manage their SEO settings"
  ON community_seo_settings
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (role = 'admin' AND community_id = community_seo_settings.community_id)
         OR is_super_admin = true
    )
  );

-- Comment
COMMENT ON TABLE community_seo_settings IS 'SEO metadata settings per community for search engines and social media';
