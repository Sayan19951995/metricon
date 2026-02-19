-- Подтверждение заказа менеджером
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by TEXT;

-- Индекс для фильтрации неподтверждённых
CREATE INDEX IF NOT EXISTS idx_orders_confirmed ON orders(confirmed_at) WHERE confirmed_at IS NULL;
