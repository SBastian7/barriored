-- Migration: Fix audit_logs -> profiles relationship
-- Date: 2026-03-04
-- Description: Change audit_logs.user_id foreign key from auth.users to profiles

-- Drop existing foreign key to auth.users
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Add foreign key to profiles instead
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add comment
COMMENT ON CONSTRAINT audit_logs_user_id_fkey ON audit_logs IS
  'Links audit log entries to user profiles for displaying user information';
