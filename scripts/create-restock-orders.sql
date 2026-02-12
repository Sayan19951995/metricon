-- Таблица поставок на склад (ручной учёт)
CREATE TABLE IF NOT EXISTS restock_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_transit',  -- in_transit, completed, cancelled
  order_date TIMESTAMPTZ DEFAULT now(),
  expected_date TIMESTAMPTZ,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC DEFAULT 0,
  delivery_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their store restock orders"
  ON restock_orders FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

-- Index
CREATE INDEX IF NOT EXISTS idx_restock_orders_store_id ON restock_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_restock_orders_status ON restock_orders(status);
