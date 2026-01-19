# Быстрый старт - Kaspi Automation

Пошаговая инструкция для запуска автоматизации Kaspi.

## 1. Установка браузера Playwright

```bash
npm run playwright:install
```

Эта команда установит браузер Chromium, который будет использоваться для автоматизации.

## 2. Настройка credentials

Создайте файл `.env.local` в корне проекта:

```bash
# Windows
copy .env.example .env.local

# Linux/Mac
cp .env.example .env.local
```

Откройте `.env.local` и добавьте ваши данные:

```env
KASPI_MERCHANT_USERNAME="ваш_логин"
KASPI_MERCHANT_PASSWORD="ваш_пароль"
```

**ВАЖНО:**
- Используйте логин и пароль от личного кабинета Kaspi Merchant
- Файл `.env.local` уже добавлен в `.gitignore` и не будет закоммичен
- Никогда не делитесь этими данными

## 3. Тестовый запуск

Запустите тестовый скрипт для проверки авторизации:

```bash
npm run test:automation
```

Этот скрипт:
- Откроет браузер (вы увидите окно)
- Выполнит авторизацию в Kaspi кабинете
- Сохранит сессию для повторного использования
- Закроет браузер

Если все работает, вы увидите:
```
✅ Успешная авторизация!
✅ Сессия сохранена
✅ Тест завершен успешно!
```

## 4. Использование через API

### Запустите dev сервер:

```bash
npm run dev
```

### Авторизация:

```bash
curl -X POST http://localhost:3000/api/kaspi/automation/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ваш_логин",
    "password": "ваш_пароль",
    "headless": true
  }'
```

Сохраните `sessionId` из ответа.

### Изменение цены товара:

```bash
curl -X POST http://localhost:3000/api/kaspi/automation/update-price \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "ваш_session_id",
    "updates": {
      "sku": "PROD-001",
      "name": "Название товара",
      "newPrice": 15990
    }
  }'
```

### Обновление остатков:

```bash
curl -X POST http://localhost:3000/api/kaspi/automation/update-stock \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "ваш_session_id",
    "updates": {
      "sku": "PROD-001",
      "name": "Название товара",
      "newStock": 50
    }
  }'
```

### Добавление нового товара:

```bash
curl -X POST http://localhost:3000/api/kaspi/automation/add-product \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "ваш_session_id",
    "product": {
      "name": "Новый товар",
      "description": "Описание товара",
      "price": 25990,
      "stock": 10,
      "category": "Электроника"
    }
  }'
```

### Закрытие сессии:

```bash
curl -X DELETE http://localhost:3000/api/kaspi/automation/login \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "ваш_session_id"}'
```

## 5. Использование в коде

```typescript
// Авторизация
const loginResponse = await fetch('/api/kaspi/automation/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: process.env.KASPI_MERCHANT_USERNAME,
    password: process.env.KASPI_MERCHANT_PASSWORD,
    headless: true,
  }),
});

const { sessionId } = await loginResponse.json();

// Массовое обновление цен
const priceResponse = await fetch('/api/kaspi/automation/update-price', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    updates: [
      { sku: 'PROD-001', name: 'Товар 1', newPrice: 15990 },
      { sku: 'PROD-002', name: 'Товар 2', newPrice: 25990 },
    ],
  }),
});

const result = await priceResponse.json();
console.log(`Updated ${result.results.success.length} products`);

// Закрываем сессию
await fetch('/api/kaspi/automation/login', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId }),
});
```

## 6. Автоматизация с помощью скриптов

Создайте скрипт для автоматического обновления цен:

```typescript
// scripts/daily-price-update.ts
import { KaspiAutomation } from '@/lib/kaspi/automation';

async function updatePricesDaily() {
  const automation = new KaspiAutomation({
    username: process.env.KASPI_MERCHANT_USERNAME!,
    password: process.env.KASPI_MERCHANT_PASSWORD!,
  });

  try {
    await automation.init(true);

    // Загружаем сохраненную сессию
    const loaded = await automation.loadSession();
    if (!loaded) {
      await automation.login();
      await automation.saveSession();
    }

    // Обновляем цены
    const updates = [
      { sku: 'PROD-001', name: 'Товар 1', newPrice: 15990 },
      { sku: 'PROD-002', name: 'Товар 2', newPrice: 25990 },
    ];

    const results = await automation.bulkUpdatePrices(updates);
    console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);

  } finally {
    await automation.close();
  }
}

updatePricesDaily();
```

Добавьте в `package.json`:
```json
{
  "scripts": {
    "update-prices": "tsx scripts/daily-price-update.ts"
  }
}
```

Запуск:
```bash
npm run update-prices
```

## Troubleshooting

### Ошибка "Login failed"
- Проверьте правильность логина/пароля в `.env.local`
- Посмотрите скриншот `kaspi-login-error.png`
- Убедитесь, что аккаунт не заблокирован

### Ошибка "Browser not found"
```bash
npm run playwright:install
```

### Ошибка "Session not found"
- Выполните авторизацию заново
- Сессия могла истечь

### Ошибка "Failed to update price/stock"
- Проверьте что товар с таким SKU существует
- Посмотрите скриншот ошибки
- Проверьте селекторы в `lib/kaspi/automation.ts`

## Полная документация

Подробная документация доступна в [kaspi-automation.md](./kaspi-automation.md)

## Безопасность

- ✅ Логин/пароль хранятся в `.env.local` (не коммитится)
- ✅ Сессии сохраняются в `/sessions/*.json` (не коммитится)
- ✅ Скриншоты ошибок не коммитятся
- ⚠️ Используйте HTTPS в продакшене
- ⚠️ Ограничьте доступ к API endpoints
- ⚠️ Не делайте слишком частые запросы

## Полезные команды

```bash
# Тест авторизации с видимым браузером
npm run test:automation

# Тест загрузки сохраненной сессии
npm run test:session

# Установка/переустановка браузера
npm run playwright:install

# Запуск dev сервера
npm run dev

# Проверка версии Playwright
npx playwright --version
```

## Следующие шаги

1. Протестируйте на тестовых товарах
2. Интегрируйте с вашим дашбордом
3. Настройте автоматические задачи (cron)
4. Мониторьте логи и ошибки
5. Оптимизируйте селекторы при необходимости

Удачи! 🚀
