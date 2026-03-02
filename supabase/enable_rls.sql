-- =======================================================
-- Включение Row Level Security (RLS) на всех таблицах
-- Запускать в Supabase Dashboard → SQL Editor
-- =======================================================

-- Хелпер-функция: проверяет доступ к магазину
-- (владелец или активный участник команды)
CREATE OR REPLACE FUNCTION user_has_store_access(p_store_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM stores WHERE id = p_store_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members WHERE store_id = p_store_id AND user_id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =======================================================
-- 1. USER-ТАБЛИЦЫ (привязка по user_id = auth.uid())
-- =======================================================

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());

-- STORES
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stores_owner_all" ON stores;
CREATE POLICY "stores_owner_all" ON stores FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "stores_team_select" ON stores;
CREATE POLICY "stores_team_select" ON stores FOR SELECT USING (
  id IN (SELECT store_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
);

-- SUBSCRIPTIONS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "subscriptions_update_own" ON subscriptions;
CREATE POLICY "subscriptions_update_own" ON subscriptions FOR UPDATE USING (user_id = auth.uid());

-- =======================================================
-- 2. STORE-ТАБЛИЦЫ (привязка через store_id → user_has_store_access)
-- =======================================================

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_store_access" ON orders;
CREATE POLICY "orders_store_access" ON orders FOR ALL USING (user_has_store_access(store_id));

-- PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_store_access" ON products;
CREATE POLICY "products_store_access" ON products FOR ALL USING (user_has_store_access(store_id));

-- DAILY_STATS
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_stats_store_access" ON daily_stats;
CREATE POLICY "daily_stats_store_access" ON daily_stats FOR ALL USING (user_has_store_access(store_id));

-- PRICELIST_FEEDS
ALTER TABLE pricelist_feeds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pricelist_feeds_store_access" ON pricelist_feeds;
CREATE POLICY "pricelist_feeds_store_access" ON pricelist_feeds FOR ALL USING (user_has_store_access(store_id));

-- RESTOCK_ORDERS
ALTER TABLE restock_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restock_orders_store_access" ON restock_orders;
CREATE POLICY "restock_orders_store_access" ON restock_orders FOR ALL USING (user_has_store_access(store_id));

-- OPERATIONAL_EXPENSES
ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operational_expenses_store_access" ON operational_expenses;
CREATE POLICY "operational_expenses_store_access" ON operational_expenses FOR ALL USING (user_has_store_access(store_id));

-- PRODUCT_GROUPS
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_groups_store_access" ON product_groups;
CREATE POLICY "product_groups_store_access" ON product_groups FOR ALL USING (user_has_store_access(store_id));

-- SEARCH_KEYWORDS
ALTER TABLE search_keywords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "search_keywords_store_access" ON search_keywords;
CREATE POLICY "search_keywords_store_access" ON search_keywords FOR ALL USING (user_has_store_access(store_id));

-- SEARCH_POSITIONS
ALTER TABLE search_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "search_positions_store_access" ON search_positions;
CREATE POLICY "search_positions_store_access" ON search_positions FOR ALL USING (user_has_store_access(store_id));

-- FEEDBACK_QUEUE
ALTER TABLE feedback_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_queue_store_access" ON feedback_queue;
CREATE POLICY "feedback_queue_store_access" ON feedback_queue FOR ALL USING (user_has_store_access(store_id));

-- FEEDBACK_SETTINGS
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_settings_store_access" ON feedback_settings;
CREATE POLICY "feedback_settings_store_access" ON feedback_settings FOR ALL USING (user_has_store_access(store_id));

-- MESSAGE_LOGS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_logs_store_access" ON message_logs;
CREATE POLICY "message_logs_store_access" ON message_logs FOR ALL USING (user_has_store_access(store_id));

-- MESSAGE_TEMPLATES
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_templates_store_access" ON message_templates;
CREATE POLICY "message_templates_store_access" ON message_templates FOR ALL USING (user_has_store_access(store_id));

-- TEAM_MEMBERS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_store_access" ON team_members;
CREATE POLICY "team_members_store_access" ON team_members FOR ALL USING (user_has_store_access(store_id));

-- AUTO_PRICING_RULES
ALTER TABLE auto_pricing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auto_pricing_rules_store_access" ON auto_pricing_rules;
CREATE POLICY "auto_pricing_rules_store_access" ON auto_pricing_rules FOR ALL USING (user_has_store_access(store_id));

-- PRICE_CHANGE_HISTORY
ALTER TABLE price_change_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_change_history_store_access" ON price_change_history;
CREATE POLICY "price_change_history_store_access" ON price_change_history FOR ALL USING (user_has_store_access(store_id));

-- =======================================================
-- ГОТОВО!
-- Все таблицы защищены.
-- API роуты используют supabaseAdmin (service role) → RLS не мешает.
-- Клиентские прямые запросы через anon key → RLS фильтрует.
-- =======================================================
