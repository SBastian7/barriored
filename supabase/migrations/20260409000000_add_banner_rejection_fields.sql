-- ============================================================================
-- Add rejection status and reason to banner_ads
-- ============================================================================

-- 1. Drop the existing CHECK constraint on status
ALTER TABLE banner_ads DROP CONSTRAINT IF EXISTS banner_ads_status_check;

-- 2. Add new CHECK constraint with 'rejected' status
ALTER TABLE banner_ads ADD CONSTRAINT banner_ads_status_check
  CHECK (status IN ('requested', 'active', 'paused', 'expired', 'rejected'));

-- 3. Add rejection_reason column
ALTER TABLE banner_ads
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. Add rejected_at timestamp
ALTER TABLE banner_ads
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 5. Add rejected_by column to track who rejected it
ALTER TABLE banner_ads
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id);

-- 6. Add index for rejected banners
CREATE INDEX IF NOT EXISTS idx_banners_rejected ON banner_ads(rejected_at DESC)
  WHERE status = 'rejected';

-- 7. Add comments
COMMENT ON COLUMN banner_ads.rejection_reason IS 'Admin explanation for why the banner was rejected';
COMMENT ON COLUMN banner_ads.rejected_at IS 'Timestamp when the banner was rejected';
COMMENT ON COLUMN banner_ads.rejected_by IS 'Admin user who rejected the banner';
