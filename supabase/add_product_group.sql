-- Добавить группу товара (Импорт / Производство) для аналитики
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_group TEXT DEFAULT NULL;

-- Добавить группу товара в операционные расходы (расход на всю группу)
ALTER TABLE operational_expenses ADD COLUMN IF NOT EXISTS product_group TEXT DEFAULT NULL;
