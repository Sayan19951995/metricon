-- Таблицы для авторассылки WhatsApp
-- Выполнить в Supabase SQL Editor

-- 1. Шаблоны сообщений (авторассылка)
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'order_created',
  name TEXT NOT NULL,
  subject TEXT,
  template_kz TEXT,
  template_ru TEXT,
  active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused')),
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_store
  ON message_templates(store_id, trigger_type, status);

-- 2. Лог отправленных сообщений (дедупликация + аудит)
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id TEXT,
  phone TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_dedup
  ON message_logs(store_id, order_id, status);
