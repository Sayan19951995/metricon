-- Add daily_report_enabled flag to stores for WhatsApp daily summary opt-in
ALTER TABLE stores ADD COLUMN IF NOT EXISTS daily_report_enabled BOOLEAN DEFAULT false;
