-- Таблица для автозагрузки прайс-листа
-- Запустить в Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS pricelist_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  feed_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  auth_login TEXT,
  auth_password TEXT,
  preorder_overrides JSONB DEFAULT '{}',
  cached_xml TEXT,
  cached_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricelist_feeds_token ON pricelist_feeds(feed_token);
CREATE INDEX IF NOT EXISTS idx_pricelist_feeds_store ON pricelist_feeds(store_id);

ALTER TABLE pricelist_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricelist_feeds_all" ON pricelist_feeds FOR ALL USING (true);
