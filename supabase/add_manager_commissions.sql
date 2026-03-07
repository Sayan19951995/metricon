-- Add manager commission/salary fields to team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS commission_offline NUMERIC DEFAULT 0;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS commission_kaspi NUMERIC DEFAULT 0;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS salary_fixed NUMERIC DEFAULT 0;

-- Add toggle for manager commissions feature on stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS manager_commissions_enabled BOOLEAN DEFAULT false;
