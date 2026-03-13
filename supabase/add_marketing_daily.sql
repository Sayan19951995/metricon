-- Ежедневные данные маркетинга по каналам
CREATE TABLE IF NOT EXISTS marketing_daily (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date date NOT NULL,

  -- Product Ads (реклама товаров внутри Kaspi)
  product_ads_cost numeric(12,2) DEFAULT 0,
  product_ads_gmv numeric(12,2) DEFAULT 0,
  product_ads_transactions integer DEFAULT 0,
  product_ads_views integer DEFAULT 0,
  product_ads_clicks integer DEFAULT 0,

  -- External Ads (внешняя реклама)
  external_ads_cost numeric(12,2) DEFAULT 0,
  external_ads_gmv numeric(12,2) DEFAULT 0,
  external_ads_transactions integer DEFAULT 0,

  -- Seller Bonuses (бонусы от продавца)
  seller_bonuses_cost numeric(12,2) DEFAULT 0,
  seller_bonuses_gmv numeric(12,2) DEFAULT 0,
  seller_bonuses_transactions integer DEFAULT 0,

  -- Review Bonuses (бонусы за отзывы)
  review_bonuses_cost numeric(12,2) DEFAULT 0,

  -- Итого
  total_cost numeric(12,2) DEFAULT 0,

  synced_at timestamptz DEFAULT now(),

  UNIQUE(store_id, date)
);

CREATE INDEX IF NOT EXISTS marketing_daily_store_date ON marketing_daily(store_id, date DESC);

-- RLS
ALTER TABLE marketing_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own marketing data" ON marketing_daily
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  );
