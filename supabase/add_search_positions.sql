-- Кастомные ключевые слова для отслеживания позиций товара
CREATE TABLE IF NOT EXISTS search_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_search_keywords_store ON search_keywords(store_id);
CREATE INDEX IF NOT EXISTS idx_search_keywords_product ON search_keywords(product_id);

-- История позиций в поиске Kaspi
CREATE TABLE IF NOT EXISTS search_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  position_organic INT,
  position_ad INT,
  total_results INT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_positions_store ON search_positions(store_id);
CREATE INDEX IF NOT EXISTS idx_search_positions_product ON search_positions(product_id, checked_at DESC);

-- RLS
ALTER TABLE search_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_keywords_owner ON search_keywords
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  );

CREATE POLICY search_positions_owner ON search_positions
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  );
