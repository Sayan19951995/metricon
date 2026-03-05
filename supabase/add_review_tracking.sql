-- Add review tracking columns to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_review_count integer DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_rating numeric(3,1) DEFAULT 0;
