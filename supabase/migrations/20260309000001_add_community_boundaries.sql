-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add boundary column to communities table
ALTER TABLE communities
ADD COLUMN boundary GEOMETRY(Polygon, 4326);

-- Add spatial index for efficient point-in-polygon queries
CREATE INDEX idx_communities_boundary
ON communities USING GIST (boundary);

-- Helper function for boundary validation
CREATE OR REPLACE FUNCTION is_location_in_community_boundary(
  community_uuid UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM communities
    WHERE id = community_uuid
    AND boundary IS NOT NULL
    AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  );
END;
$$ LANGUAGE plpgsql;
