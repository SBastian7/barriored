-- Migration: Marketplace automation support
-- Adds renewal_reminder_sent_at to classifieds for 3-day expiry reminder dedup

ALTER TABLE classifieds
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN classifieds.renewal_reminder_sent_at IS
  'Set when the 3-day expiry reminder email is sent. NULL = not sent yet (or reset on reactivation).';
