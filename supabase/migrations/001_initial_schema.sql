-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Communities table
CREATE TABLE communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  municipality text NOT NULL,
  department text NOT NULL,
  description text,
  logo_url text,
  primary_color text DEFAULT '#1E40AF',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Categories table (global)
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  parent_id uuid REFERENCES categories(id),
  sort_order int DEFAULT 0
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id),
  full_name text,
  phone text,
  role text DEFAULT 'neighbor' CHECK (role IN ('neighbor', 'merchant', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Businesses table
CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  category_id uuid NOT NULL REFERENCES categories(id),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  address text,
  location geography(Point, 4326),
  phone text,
  whatsapp text,
  email text,
  website text,
  hours jsonb,
  photos text[],
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (community_id, slug)
);

-- Indexes
CREATE INDEX idx_businesses_community ON businesses(community_id);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX idx_businesses_search ON businesses USING GIN(
  to_tsvector('spanish', name || ' ' || COALESCE(description, ''))
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full-text search function
CREATE OR REPLACE FUNCTION search_businesses(query text, comm_id uuid)
RETURNS SETOF businesses AS $$
  SELECT *
  FROM businesses
  WHERE community_id = comm_id
    AND status = 'approved'
    AND to_tsvector('spanish', name || ' ' || COALESCE(description, ''))
        @@ plainto_tsquery('spanish', query)
  ORDER BY ts_rank(
    to_tsvector('spanish', name || ' ' || COALESCE(description, '')),
    plainto_tsquery('spanish', query)
  ) DESC;
$$ LANGUAGE sql STABLE;

-- Nearby businesses function
CREATE OR REPLACE FUNCTION nearby_businesses(lat float, lng float, radius_km float, comm_id uuid)
RETURNS SETOF businesses AS $$
  SELECT *
  FROM businesses
  WHERE community_id = comm_id
    AND status = 'approved'
    AND ST_DWithin(location, ST_MakePoint(lng, lat)::geography, radius_km * 1000)
  ORDER BY ST_Distance(location, ST_MakePoint(lng, lat)::geography);
$$ LANGUAGE sql STABLE;
