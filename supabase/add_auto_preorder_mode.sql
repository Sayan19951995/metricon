-- Add auto-preorder mode and SKU list columns to stores
-- Run this in Supabase Dashboard SQL Editor

ALTER TABLE stores ADD COLUMN IF NOT EXISTS auto_preorder_mode text DEFAULT 'all';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS auto_preorder_skus jsonb DEFAULT '[]'::jsonb;
