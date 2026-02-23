-- Добавляем поле источника продажи менеджера
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_source VARCHAR;
