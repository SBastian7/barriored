ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS latitude  FLOAT8,
  ADD COLUMN IF NOT EXISTS longitude FLOAT8;

UPDATE businesses
SET
  latitude  = ST_Y(location::geometry),
  longitude = ST_X(location::geometry)
WHERE location IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_business_lat_lng()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    NEW.latitude  := ST_Y(NEW.location::geometry);
    NEW.longitude := ST_X(NEW.location::geometry);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_business_lat_lng ON businesses;
CREATE TRIGGER trg_sync_business_lat_lng
  BEFORE INSERT OR UPDATE OF location ON businesses
  FOR EACH ROW EXECUTE FUNCTION sync_business_lat_lng();
