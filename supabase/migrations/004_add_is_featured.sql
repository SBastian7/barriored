-- Add is_featured column to businesses table for Phase 2 monetization
-- Featured businesses will be displayed prominently on homepage

ALTER TABLE businesses
ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on featured businesses
CREATE INDEX idx_businesses_featured ON businesses(is_featured, community_id, status)
WHERE is_featured = TRUE AND status = 'approved';

-- Add comment
COMMENT ON COLUMN businesses.is_featured IS 'Premium/featured businesses that are displayed prominently on homepage';
