-- Таблица для динамических групп товаров
CREATE TABLE IF NOT EXISTS product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_groups_store_slug
  ON product_groups(store_id, slug);

-- Бэкфилл: создать группы для магазинов, которые уже используют 'import' / 'production'
INSERT INTO product_groups (store_id, name, slug, color)
SELECT DISTINCT s.id, 'Импорт', 'import', '#3b82f6'
FROM stores s
WHERE EXISTS (SELECT 1 FROM products p WHERE p.store_id = s.id AND p.product_group = 'import')
ON CONFLICT (store_id, slug) DO NOTHING;

INSERT INTO product_groups (store_id, name, slug, color)
SELECT DISTINCT s.id, 'Производство', 'production', '#10b981'
FROM stores s
WHERE EXISTS (SELECT 1 FROM products p WHERE p.store_id = s.id AND p.product_group = 'production')
ON CONFLICT (store_id, slug) DO NOTHING;
