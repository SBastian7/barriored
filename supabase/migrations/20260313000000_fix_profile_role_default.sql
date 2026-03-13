-- Migration: Fix Profile Role Default Value
-- Date: 2026-03-13
-- Description: Change DEFAULT role from 'neighbor' to 'user' to match updated constraint
-- Critical: Fixes signup error - deploy immediately

-- Step 1: Update existing profiles with old role values
UPDATE profiles
SET role = 'user'
WHERE role IN ('neighbor', 'merchant');

-- Step 2: Change the DEFAULT value from 'neighbor' to 'user'
ALTER TABLE profiles
ALTER COLUMN role SET DEFAULT 'user';

-- Verification: The constraint already allows ['user', 'moderator', 'admin']
-- from migration 20260303000001_fix_multi_tenant_rls.sql
-- This migration just fixes the DEFAULT to match the constraint

COMMENT ON COLUMN profiles.role IS
  'User role: user (default for all new signups), moderator (content moderation only), admin (full community access)';
