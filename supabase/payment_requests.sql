-- Payment requests from users (Kaspi invoice flow)
CREATE TABLE IF NOT EXISTS payment_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  user_name   TEXT,
  user_email  TEXT,
  plan_id     TEXT        NOT NULL,
  plan_name   TEXT        NOT NULL,
  price       INTEGER     NOT NULL,
  kaspi_phone TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending', -- pending | confirmed | rejected
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_requests_status_idx ON payment_requests(status);
CREATE INDEX IF NOT EXISTS payment_requests_created_idx ON payment_requests(created_at DESC);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
