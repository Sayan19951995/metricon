-- Add is_blocked column to users table
-- Run this in Supabase Dashboard SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
