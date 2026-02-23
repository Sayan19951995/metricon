-- Таблицы для автоцены
-- Выполнить в Supabase SQL Editor

-- 1. Правила автоцены (одна запись на товар)
CREATE TABLE IF NOT EXISTS auto_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT,
  strategy TEXT NOT NULL DEFAULT 'undercut'
    CHECK (strategy IN ('undercut', 'match', 'position')),
  min_price INTEGER NOT NULL,
  max_price INTEGER NOT NULL,
  step INTEGER NOT NULL DEFAULT 1000,
  target_position INTEGER,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'error')),
  last_competitor_price INTEGER,
  last_competitor_name TEXT,
  last_check_at TIMESTAMPTZ,
  last_price_change_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_auto_pricing_store
  ON auto_pricing_rules(store_id, status);

-- 2. История изменений цен
CREATE TABLE IF NOT EXISTS price_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES auto_pricing_rules(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  product_name TEXT,
  change_type TEXT NOT NULL
    CHECK (change_type IN ('decrease', 'increase', 'match')),
  old_price INTEGER NOT NULL,
  new_price INTEGER NOT NULL,
  competitor_price INTEGER,
  competitor_name TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_store
  ON price_change_history(store_id, created_at DESC);
