-- Migration: Super Admin Platform Management
-- Date: 2026-05-11

-- 1. Add primary_admin_id to communities
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS primary_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Platform config (singleton)
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  platform_name TEXT NOT NULL DEFAULT 'BarrioRed',
  support_email TEXT,
  support_phone TEXT,
  marketplace_enabled BOOLEAN NOT NULL DEFAULT true,
  community_posts_enabled BOOLEAN NOT NULL DEFAULT true,
  new_registrations_open BOOLEAN NOT NULL DEFAULT true,
  max_businesses_per_community INT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Seed one row
INSERT INTO platform_config (platform_name, singleton)
  VALUES ('BarrioRed', true)
  ON CONFLICT (singleton) DO NOTHING;

-- RLS
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_config_read" ON platform_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform_config_write" ON platform_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- 3. Platform policies
CREATE TABLE IF NOT EXISTS platform_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO platform_policies (type, title) VALUES
  ('terms',     'Términos de Servicio'),
  ('privacy',   'Política de Privacidad'),
  ('content',   'Política de Contenido'),
  ('community', 'Normas Comunitarias')
ON CONFLICT (type) DO NOTHING;

ALTER TABLE platform_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_policies_read" ON platform_policies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform_policies_write" ON platform_policies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- 4. Platform payment config
CREATE TABLE IF NOT EXISTS platform_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'test',
  public_key TEXT,
  private_key TEXT,
  webhook_secret TEXT,
  account_identifier TEXT,
  commission_rate NUMERIC(5,4) DEFAULT 0.03,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO platform_payment_config (gateway) VALUES
  ('wompi'), ('nequi'), ('mercadopago')
ON CONFLICT (gateway) DO NOTHING;

ALTER TABLE platform_payment_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_config_super_admin" ON platform_payment_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- 5. Service categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'circle',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO service_categories (name, slug, icon, sort_order) VALUES
  ('Emergencias',       'emergency',   'siren',       0),
  ('Salud',             'health',      'heart-pulse',  1),
  ('Gobierno',          'government',  'landmark',     2),
  ('Transporte',        'transport',   'bus',          3),
  ('Servicios Públicos','utilities',   'zap',          4)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_categories_read" ON service_categories
  FOR SELECT USING (true);
CREATE POLICY "service_categories_write" ON service_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- 6. Migrate public_services.category → service_category_id FK
ALTER TABLE public_services
  ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id);

-- Backfill from text value to FK
UPDATE public_services ps
SET service_category_id = sc.id
FROM service_categories sc
WHERE ps.category = sc.slug
  AND ps.service_category_id IS NULL;

-- Note: do NOT drop public_services.category yet — verify backfill in production first.
-- Run after confirming: ALTER TABLE public_services DROP COLUMN category;
