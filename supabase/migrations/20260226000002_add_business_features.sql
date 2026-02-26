-- Add deletion request fields to businesses table
ALTER TABLE businesses
  ADD COLUMN deletion_requested boolean DEFAULT false,
  ADD COLUMN deletion_reason text,
  ADD COLUMN deletion_requested_at timestamp;

CREATE INDEX idx_businesses_deletion_requested ON businesses(deletion_requested)
  WHERE deletion_requested = true;

-- Extend community_posts type constraint to include 'promotion'
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('announcement', 'event', 'job', 'promotion'));

-- Add last_promoted_at for rate limiting
ALTER TABLE community_posts
  ADD COLUMN last_promoted_at timestamp;

CREATE INDEX idx_community_posts_type_promotion ON community_posts(type)
  WHERE type = 'promotion';

-- Add comments
COMMENT ON COLUMN businesses.deletion_requested IS 'Business owner requested deletion';
COMMENT ON COLUMN businesses.deletion_reason IS 'Reason provided by owner for deletion';
COMMENT ON COLUMN community_posts.last_promoted_at IS 'Last time business created a promotion (for rate limiting)';
