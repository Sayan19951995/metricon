-- Добавляем колонку kaspi_stock для хранения "искусственного" остатка для Kaspi
-- quantity = фактический остаток на складе
-- kaspi_stock = остаток который видит Kaspi (управляется пользователем, минусуется при продажах)

ALTER TABLE products ADD COLUMN IF NOT EXISTS kaspi_stock INTEGER DEFAULT NULL;

-- Инициализировать kaspi_stock из текущего quantity для существующих товаров
UPDATE products SET kaspi_stock = quantity WHERE quantity IS NOT NULL AND quantity > 0;
