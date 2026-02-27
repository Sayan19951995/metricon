-- Add UTM tracking columns to users table
-- Run this in the Supabase Dashboard SQL editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_campaign text;
