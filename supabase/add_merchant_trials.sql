-- Таблица для отслеживания использованных пробных периодов по merchant_id
-- Один merchant_id = один пробный период навсегда (защита от фейк-аккаунтов)
CREATE TABLE IF NOT EXISTS merchant_trials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kaspi_merchant_id TEXT NOT NULL UNIQUE,
  used_by_user_id UUID NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_merchant_trials_merchant_id ON merchant_trials (kaspi_merchant_id);
