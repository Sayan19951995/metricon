-- Добавляем поле комментария/контакта клиента для продажи менеджера
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_comment TEXT;
