-- Add last_synced_at column to stores table
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
