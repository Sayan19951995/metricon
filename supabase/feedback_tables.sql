-- Feedback system: опросы после выдачи заказа
-- Выполнить в Supabase SQL Editor

-- 1. Очередь опросов
CREATE TABLE IF NOT EXISTS feedback_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','poll_sent','positive','negative','expired','failed')),
  poll_message_id TEXT,
  poll_sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response TEXT,
  review_links_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_pending
  ON feedback_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_feedback_poll_sent
  ON feedback_queue(store_id, customer_phone, status) WHERE status = 'poll_sent';

-- 2. Настройки обратной связи (per store)
CREATE TABLE IF NOT EXISTS feedback_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  delay_minutes INTEGER DEFAULT 10,
  poll_question TEXT DEFAULT 'Как вам заказ? Оцените пожалуйста',
  good_option TEXT DEFAULT 'Отлично',
  bad_option TEXT DEFAULT 'Плохо',
  good_response TEXT DEFAULT 'Спасибо! Будем рады, если оставите отзыв:',
  bad_response TEXT DEFAULT 'Нам жаль это слышать. Расскажите, что случилось?',
  expire_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
