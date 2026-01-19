# Kaspi Automation API

Система автоматизации для управления товарами в личном кабинете Kaspi.kz через веб-интерфейс.

## Возможности

- Авторизация в личном кабинете Kaspi Merchant
- Изменение цен товаров
- Управление остатками
- Добавление новых товаров
- Настройка предзаказов
- Массовые операции
- Сохранение/загрузка сессий

## Безопасность

**ВАЖНО:**
- Храните логин и пароль в переменных окружения (`.env.local`)
- Никогда не коммитьте credentials в репозиторий
- Используйте HTTPS для всех API запросов
- Ограничьте доступ к API endpoints

Добавьте в `.env.local`:
```env
KASPI_MERCHANT_USERNAME=your_username
KASPI_MERCHANT_PASSWORD=your_password
```

## API Endpoints

### 1. Авторизация

#### POST `/api/kaspi/automation/login`

Создает сессию автоматизации и выполняет вход в личный кабинет.

**Request:**
```json
{
  "username": "your_username",
  "password": "your_password",
  "headless": true,
  "sessionId": "optional_custom_id"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123",
  "message": "Successfully logged in to Kaspi Merchant Cabinet"
}
```

**Curl пример:**
```bash
curl -X POST http://localhost:3000/api/kaspi/automation/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password",
    "headless": true
  }'
```

#### GET `/api/kaspi/automation/login?sessionId=xxx`

Проверка статуса сессии.

**Response:**
```json
{
  "active": true,
  "sessionId": "session_1234567890_abc123"
}
```

#### DELETE `/api/kaspi/automation/login`

Закрытие сессии и освобождение ресурсов.

**Request:**
```json
{
  "sessionId": "session_1234567890_abc123"
}
```

---

### 2. Изменение цен

#### POST `/api/kaspi/automation/update-price`

Обновление цены одного или нескольких товаров.

**Одиночное обновление:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "updates": {
    "sku": "PROD-001",
    "name": "Название товара",
    "newPrice": 15990
  }
}
```

**Массовое обновление:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "updates": [
    {
      "sku": "PROD-001",
      "name": "Товар 1",
      "newPrice": 15990
    },
    {
      "sku": "PROD-002",
      "name": "Товар 2",
      "newPrice": 25990
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "success": ["PROD-001", "PROD-002"],
    "failed": []
  },
  "message": "Updated 2 products, failed 0"
}
```

**Curl пример:**
```bash
curl -X POST http://localhost:3000/api/kaspi/automation/update-price \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "updates": {
      "sku": "PROD-001",
      "name": "Товар 1",
      "newPrice": 15990
    }
  }'
```

---

### 3. Управление остатками

#### POST `/api/kaspi/automation/update-stock`

Обновление количества товара на складе.

**Одиночное обновление:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "updates": {
    "sku": "PROD-001",
    "name": "Название товара",
    "newStock": 50
  }
}
```

**Массовое обновление:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "updates": [
    {
      "sku": "PROD-001",
      "name": "Товар 1",
      "newStock": 50
    },
    {
      "sku": "PROD-002",
      "name": "Товар 2",
      "newStock": 100
    }
  ]
}
```

---

### 4. Добавление товара

#### POST `/api/kaspi/automation/add-product`

Добавление нового товара в каталог.

**Request:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "product": {
    "name": "Новый товар",
    "description": "Описание товара",
    "price": 25990,
    "stock": 10,
    "category": "Электроника",
    "sku": "PROD-NEW-001",
    "images": [
      "/path/to/image1.jpg",
      "/path/to/image2.jpg"
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "product": {
    "name": "Новый товар",
    "sku": "PROD-NEW-001"
  },
  "message": "Product added successfully"
}
```

---

### 5. Настройка предзаказа

#### POST `/api/kaspi/automation/preorder`

Включение/выключение предзаказа для товара.

**Request:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "sku": "PROD-001",
  "enabled": true,
  "availableFrom": "2026-02-01"
}
```

**Response:**
```json
{
  "success": true,
  "sku": "PROD-001",
  "enabled": true,
  "message": "Pre-order enabled for product PROD-001"
}
```

---

## Использование в коде

### TypeScript/JavaScript пример

```typescript
// 1. Авторизация
async function loginToKaspi() {
  const response = await fetch('/api/kaspi/automation/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.KASPI_MERCHANT_USERNAME,
      password: process.env.KASPI_MERCHANT_PASSWORD,
      headless: true,
    }),
  });

  const data = await response.json();
  return data.sessionId;
}

// 2. Изменение цен
async function updatePrices(sessionId: string) {
  const response = await fetch('/api/kaspi/automation/update-price', {
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

  return await response.json();
}

// 3. Обновление остатков
async function updateStock(sessionId: string, sku: string, newStock: number) {
  const response = await fetch('/api/kaspi/automation/update-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      updates: { sku, name: sku, newStock },
    }),
  });

  return await response.json();
}

// 4. Добавление товара
async function addProduct(sessionId: string) {
  const response = await fetch('/api/kaspi/automation/add-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      product: {
        name: 'Новый товар',
        description: 'Описание',
        price: 15990,
        stock: 10,
        category: 'Электроника',
      },
    }),
  });

  return await response.json();
}

// 5. Закрытие сессии
async function closeSession(sessionId: string) {
  await fetch('/api/kaspi/automation/login', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}

// Полный пример использования
async function main() {
  let sessionId: string | null = null;

  try {
    // Логин
    sessionId = await loginToKaspi();
    console.log('Logged in, session:', sessionId);

    // Обновление цен
    const priceResult = await updatePrices(sessionId);
    console.log('Prices updated:', priceResult);

    // Обновление остатков
    const stockResult = await updateStock(sessionId, 'PROD-001', 50);
    console.log('Stock updated:', stockResult);

    // Добавление товара
    const addResult = await addProduct(sessionId);
    console.log('Product added:', addResult);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Всегда закрываем сессию
    if (sessionId) {
      await closeSession(sessionId);
      console.log('Session closed');
    }
  }
}
```

---

## Автоматизация с помощью cron

Пример скрипта для регулярного обновления цен:

```typescript
// scripts/update-prices-daily.ts
import { KaspiAutomation } from '@/lib/kaspi/automation';

async function dailyPriceUpdate() {
  const automation = new KaspiAutomation({
    username: process.env.KASPI_MERCHANT_USERNAME!,
    password: process.env.KASPI_MERCHANT_PASSWORD!,
  });

  try {
    await automation.init(true); // headless mode

    // Попытка загрузить сохраненную сессию
    const sessionLoaded = await automation.loadSession();

    if (!sessionLoaded) {
      // Если сессии нет, логинимся заново
      await automation.login();
      await automation.saveSession();
    }

    // Получаем цены конкурентов из вашей базы
    const competitorPrices = await getCompetitorPrices();

    // Формируем обновления
    const updates = competitorPrices.map(item => ({
      sku: item.sku,
      name: item.name,
      newPrice: calculateOptimalPrice(item),
    }));

    // Обновляем цены
    const results = await automation.bulkUpdatePrices(updates);

    console.log(`Updated ${results.success.length} prices`);
    console.log(`Failed: ${results.failed.length}`);

  } catch (error) {
    console.error('Daily price update failed:', error);
  } finally {
    await automation.close();
  }
}

// Запуск
dailyPriceUpdate();
```

Добавьте в `package.json`:
```json
{
  "scripts": {
    "update-prices": "tsx scripts/update-prices-daily.ts"
  }
}
```

Настройте cron (Linux/Mac):
```bash
# Запуск каждый день в 2:00 ночи
0 2 * * * cd /path/to/project && npm run update-prices
```

---

## Примечания

### Headless vs GUI режим

- **Headless (headless: true)**: Браузер работает в фоне без интерфейса. Быстрее и экономнее.
- **GUI (headless: false)**: Видно окно браузера. Полезно для отладки.

### Сохранение сессий

Сессии сохраняются в файлы и могут быть переиспользованы:

```typescript
// Сохранить сессию
await automation.saveSession('./my-session.json');

// Загрузить сессию
await automation.loadSession('./my-session.json');
```

Это позволяет избежать повторной авторизации.

### Обработка ошибок

При ошибках создаются скриншоты для отладки:
- `kaspi-login-error.png` - ошибка авторизации
- `kaspi-price-error-{sku}.png` - ошибка обновления цены
- `kaspi-stock-error-{sku}.png` - ошибка обновления остатков

### Важные селекторы

Если интерфейс Kaspi изменится, может потребоваться обновить селекторы в [lib/kaspi/automation.ts](../lib/kaspi/automation.ts).

Текущие селекторы:
- Форма входа: `input[type="text"], input[type="email"], input[name="username"]`
- Поиск товаров: `input[type="search"], input[placeholder*="Поиск"]`
- Поле цены: `input[type="number"]:near(:text("Цена")), input[name*="price"]`
- Поле остатков: `input[type="number"]:near(:text("Остаток")), input[name*="stock"]`

---

## Лимиты и рекомендации

1. **Не злоупотребляйте**: Делайте паузы между операциями (1-2 секунды)
2. **Используйте headless**: В продакшене всегда используйте headless режим
3. **Закрывайте сессии**: Всегда закрывайте сессии после использования
4. **Логирование**: Включите подробное логирование для отладки
5. **Мониторинг**: Следите за изменениями в UI Kaspi

---

## Устранение проблем

### "Login failed"
- Проверьте правильность логина/пароля
- Убедитесь, что аккаунт не заблокирован
- Проверьте скриншот `kaspi-login-error.png`

### "Session not found"
- Сессия истекла или была закрыта
- Выполните новую авторизацию

### "Failed to update price/stock"
- Товар с таким SKU не найден
- Проверьте селекторы в коде
- Посмотрите скриншот ошибки

### Браузер не запускается
```bash
# Установите браузеры Playwright
npx playwright install chromium
```

---

## Пример интеграции с дашбордом

```typescript
// app/dashboard/automation/page.tsx
'use client';

import { useState } from 'react';

export default function AutomationPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kaspi/automation/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: prompt('Username:'),
          password: prompt('Password:'),
          headless: false, // Показать браузер для демо
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.sessionId);
        alert('Успешно авторизовались!');
      }
    } catch (error) {
      alert('Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!sessionId) {
      alert('Сначала авторизуйтесь');
      return;
    }

    const sku = prompt('SKU товара:');
    const newPrice = prompt('Новая цена:');

    setLoading(true);
    try {
      const response = await fetch('/api/kaspi/automation/update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          updates: {
            sku,
            name: sku,
            newPrice: Number(newPrice),
          },
        }),
      });

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      alert('Ошибка обновления цены');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Kaspi Automation</h1>

      {!sessionId ? (
        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          {loading ? 'Авторизация...' : 'Войти в Kaspi'}
        </button>
      ) : (
        <div>
          <p className="mb-4 text-green-600">Авторизован: {sessionId}</p>

          <div className="space-x-4">
            <button
              onClick={handleUpdatePrice}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded"
            >
              Изменить цену
            </button>

            <button
              onClick={() => setSessionId(null)}
              className="bg-red-600 text-white px-6 py-3 rounded"
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Поддержка

Если возникли проблемы или вопросы:
1. Проверьте скриншоты ошибок
2. Посмотрите логи в консоли
3. Обновите селекторы при изменении UI Kaspi
4. Убедитесь что Playwright установлен корректно
