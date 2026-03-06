-- WhatsApp session storage (credentials persist across Railway restarts/deploys)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  store_id TEXT PRIMARY KEY,
  creds    JSONB,
  keys     JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only the service role should access this table
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
