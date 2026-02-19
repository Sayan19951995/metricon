-- Таблица участников команды
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'warehouse', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive')),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, email)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_team_members_store ON team_members(store_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);

-- RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Владелец магазина видит всех членов команды
CREATE POLICY team_members_owner_all ON team_members
  FOR ALL
  USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  );

-- Участник видит свою запись
CREATE POLICY team_members_self_read ON team_members
  FOR SELECT
  USING (user_id = auth.uid());
