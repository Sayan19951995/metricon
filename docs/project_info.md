# Metricon Analytics — Project Info

> Читай ТОЛЬКО этот файл для полного понимания проекта.
> Последнее обновление: 2026-02-08

## Что это

SaaS-платформа для продавцов Kaspi.kz — аналитика, управление заказами, авто-прайсинг, маркетинг.
Домен: metricon.kz. Деплой: Vercel. БД: Supabase (PostgreSQL).

## Стек

- **Framework**: Next.js 16.1.1 (App Router, Turbopack dev, Webpack build)
- **React**: 19.2.3
- **Стили**: Tailwind CSS 4.1.18 + clsx + tailwind-merge
- **Анимации**: Framer Motion 12.26.2
- **Графики**: Recharts 3.6.0
- **Иконки**: Lucide React
- **БД**: Supabase (@supabase/supabase-js 2.93.3) — единственный ORM/клиент
- **Auth**: Supabase Auth (Google OAuth + email/password)
- **Валидация**: Zod 4.3.5
- **HTTP**: Axios 1.13.2
- **Парсинг**: Cheerio 1.1.2
- **Автоматизация**: Playwright 1.57.0 (логин в Kaspi кабинет)
- **Email**: Nodemailer 7.0.12
- **Шифрование**: bcrypt 6.0.0
- **Даты**: date-fns 4.1.0
- **TypeScript**: 5.x (strict)
- **ESLint**: 9.x

## Env-переменные

```
NEXT_PUBLIC_SUPABASE_URL     — URL Supabase проекта
NEXT_PUBLIC_SUPABASE_ANON_KEY — публичный ключ Supabase
CRON_SECRET                  — секрет для Vercel Cron (/api/cron/sync)
NODE_ENV                     — development | production
```

## Структура проекта

```
src/
├── app/
│   ├── page.tsx                        # Лендинг
│   ├── layout.tsx                      # Корневой layout
│   ├── login/page.tsx                  # Логин (Supabase Auth)
│   ├── register/page.tsx               # Регистрация
│   ├── about/page.tsx                  # О проекте
│   ├── pricing/page.tsx                # Тарифы
│   │
│   ├── app/                            # === ЗАЩИЩЁННАЯ ЗОНА (требует авторизации) ===
│   │   ├── layout.tsx                  # Layout приложения (Sidebar + Topbar)
│   │   ├── page.tsx                    # Главный дашборд (~1179 строк)
│   │   ├── orders/
│   │   │   ├── page.tsx                # Список заказов
│   │   │   ├── [code]/page.tsx         # Детали заказа
│   │   │   └── add/page.tsx            # Ручное создание заказа
│   │   ├── products/
│   │   │   ├── page.tsx                # Каталог товаров
│   │   │   └── [sku]/
│   │   │       ├── page.tsx            # Детали товара
│   │   │       └── edit/page.tsx       # Редактирование товара
│   │   ├── analytics/page.tsx          # Аналитика продаж
│   │   ├── price-monitor/page.tsx      # Мониторинг цен конкурентов
│   │   ├── auto-pricing/
│   │   │   ├── page.tsx                # Правила авто-прайсинга
│   │   │   ├── [id]/page.tsx           # Настройка правила
│   │   │   └── history/page.tsx        # История изменений цен
│   │   ├── advertising/
│   │   │   ├── page.tsx                # Реклама — обзор
│   │   │   ├── add/page.tsx            # Создание кампании
│   │   │   ├── analytics/page.tsx      # Аналитика рекламы
│   │   │   └── kaspi-marketing/page.tsx # Kaspi маркетинг
│   │   ├── auto-mailing/page.tsx       # Авто-рассылки
│   │   ├── market-analysis/
│   │   │   ├── page.tsx                # Анализ рынка
│   │   │   ├── competitors/page.tsx    # Конкуренты
│   │   │   └── trends/page.tsx         # Тренды
│   │   ├── warehouse/
│   │   │   ├── page.tsx                # Склад
│   │   │   ├── restock/page.tsx        # Пополнение
│   │   │   ├── history/page.tsx        # История
│   │   │   └── settings/page.tsx       # Настройки склада
│   │   ├── settings/
│   │   │   ├── page.tsx                # Общие настройки
│   │   │   ├── kaspi/page.tsx          # Подключение Kaspi
│   │   │   ├── profit/page.tsx         # Настройки прибыли (комиссия, налоги)
│   │   │   ├── account/page.tsx        # Аккаунт
│   │   │   ├── appearance/page.tsx     # Тема (dark/light)
│   │   │   ├── notifications/page.tsx  # Уведомления
│   │   │   └── team/page.tsx           # Команда
│   │   ├── subscription/page.tsx       # Управление подпиской
│   │   ├── profile/page.tsx            # Профиль
│   │   ├── notifications/page.tsx      # Уведомления
│   │   └── kaspi-login/page.tsx        # Логин в Kaspi кабинет
│   │
│   ├── admin/                          # === АДМИН-ПАНЕЛЬ ===
│   │   ├── layout.tsx                  # Layout админки
│   │   ├── page.tsx                    # Дашборд админа
│   │   ├── components/AdminSidebar.tsx
│   │   ├── users/
│   │   │   ├── page.tsx                # Список пользователей
│   │   │   └── [id]/kaspi/page.tsx     # Kaspi-настройки юзера
│   │   ├── subscriptions/page.tsx      # Подписки
│   │   └── x7k9m2p4q8r1/page.tsx      # Скрытая админ-страница
│   │
│   └── api/                            # === API ROUTES ===
│       ├── analytics/route.ts          # GET — аналитика (revenue, profit, margins)
│       ├── dashboard/route.ts          # GET — метрики дашборда
│       ├── test-db/route.ts            # GET — тест подключения к БД
│       ├── store-settings/route.ts     # GET/PUT — комиссия, налоги магазина
│       ├── operational-expenses/route.ts # GET/POST/DELETE — операционные расходы
│       ├── cron/sync/route.ts          # GET — Vercel Cron: синхронизация всех магазинов (каждый час)
│       └── kaspi/
│           ├── connect/route.ts        # POST — подключение Kaspi API
│           ├── sync/route.ts           # POST — синхронизация заказов/товаров одного магазина
│           ├── orders/route.ts         # GET/PATCH — заказы из Kaspi API
│           ├── feed/route.ts           # GET/POST — управление прайслистом
│           ├── debug/route.ts          # GET — отладка
│           ├── marketing/
│           │   ├── route.ts            # Маркетинговые данные
│           │   └── campaign/route.ts   # Управление кампаниями
│           └── cabinet/
│               ├── login/route.ts      # POST — логин в Kaspi кабинет (Playwright)
│               ├── session/route.ts    # GET/DELETE — проверка/сброс сессии
│               ├── products/route.ts   # GET — товары из кабинета
│               ├── pricelist/route.ts  # Генерация прайслиста
│               └── feed/
│                   ├── route.ts        # GET/POST — настройки фида
│                   └── check/route.ts  # Проверка фида
│
├── lib/                                # === УТИЛИТЫ И КЛИЕНТЫ ===
│   ├── supabase/
│   │   ├── client.ts                   # Браузерный Supabase-клиент
│   │   ├── server.ts                   # Серверный Supabase-клиент + getServerSession()
│   │   └── middleware.ts               # Supabase middleware (updateSession)
│   ├── kaspi/
│   │   ├── client.ts                   # Kaspi API клиент (заказы, товары)
│   │   ├── api-client.ts              # Доп. API методы
│   │   ├── automation.ts              # Playwright: автоматизация логина в кабинет
│   │   ├── marketing-client.ts        # Kaspi маркетинг API
│   │   └── session-storage.ts         # Хранение Kaspi-сессий
│   ├── kaspi-api.ts                   # Главный Kaspi-клиент (createKaspiClient)
│   ├── auth.ts                        # Supabase Auth хелперы (signIn, signOut, signInWithGoogle)
│   ├── cache.ts                       # Кеширование (getCached, setCache)
│   ├── utils.ts                       # Утилиты (cn, formatPrice, formatDate)
│   ├── smoothPath.ts                  # Сглаживание линий графиков
│   ├── email/mailer.ts                # Отправка email (Nodemailer)
│   └── parser/kaspi-scraper.ts        # Парсинг Kaspi страниц (Cheerio)
│
├── components/                         # === КОМПОНЕНТЫ ===
│   ├── layout/
│   │   ├── Sidebar.tsx                 # Боковое меню
│   │   └── Topbar.tsx                  # Верхняя панель (юзер, поиск, уведомления)
│   ├── dashboard/
│   │   ├── StatCard.tsx                # Карточка статистики
│   │   ├── OrdersChart.tsx            # График заказов
│   │   ├── TopProducts.tsx            # Топ товаров
│   │   └── CompetitorPrices.tsx       # Цены конкурентов
│   ├── ui/
│   │   ├── Card.tsx                   # Базовая карточка
│   │   ├── Button.tsx                 # Кнопка
│   │   ├── Input.tsx                  # Инпут
│   │   ├── DashboardCard.tsx          # Карточка дашборда
│   │   └── BrandLoader.tsx            # Лоадер с брендом
│   ├── warehouse/
│   │   ├── CreateOrderModal.tsx       # Модалка создания заказа
│   │   └── LinkProductModal.tsx       # Привязка товара
│   └── DateRangeCalendar.tsx          # Выбор диапазона дат
│
├── hooks/
│   ├── useUser.ts                     # Хук: юзер + магазин + подписка из Supabase
│   └── useWarehouseProducts.ts        # Хук: товары склада
│
├── types/
│   ├── database.ts                    # Автогенерённые типы Supabase (scripts/update-schema.ts)
│   └── kaspi.ts                       # Типы Kaspi API (KaspiOrder, OrderState и т.д.)
│
└── contexts/
    └── ThemeContext.tsx                # Контекст темы (dark/light/system)
```

## Таблицы Supabase

| Таблица | Назначение |
|---------|-----------|
| users | Профили пользователей |
| stores | Магазины (kaspi_api_key, kaspi_merchant_id, kaspi_session) |
| orders | Заказы (синхронизируются из Kaspi) |
| products | Товары (синхронизируются из Kaspi) |
| subscriptions | Подписки (start / business / pro) |
| daily_stats | Дневная статистика (revenue, orders_count) |
| operational_expenses | Операционные расходы |
| pricelist_feeds | Настройки XML-фидов для Kaspi |
| message_templates | Шаблоны сообщений (Kz/Ru) |
| message_logs | Логи отправленных сообщений |

## Ключевые потоки данных

### Авторизация
```
Login page → supabase.auth.signInWithPassword() / signInWithOAuth('google')
  → useUser() хук: supabase.auth.getSession() → users/stores/subscriptions из Supabase
  → signOut: supabase.auth.signOut()
```

### Синхронизация заказов (Cron)
```
Vercel Cron (каждый час, vercel.json) → /api/cron/sync (CRON_SECRET)
  → для каждого магазина: /api/kaspi/sync
    → Kaspi API → orders, products, daily_stats в Supabase
```

### Kaspi кабинет
```
/api/kaspi/cabinet/login → Playwright логинится → cookies сохраняются в stores.kaspi_session
  → /api/kaspi/cabinet/products, /feed, /pricelist — используют сохранённую сессию
```

## Конфиг-файлы

| Файл | Назначение |
|------|-----------|
| vercel.json | Cron расписание: `0 * * * *` → `/api/cron/sync` |
| middleware.ts | Auth middleware (сейчас отключен) |
| next.config.ts | Next.js конфиг |
| tsconfig.json | TypeScript (strict, paths: `@/` → `src/`) |
| .env.local | Env-переменные (не в git) |

## Скрипты

| Команда | Действие |
|---------|----------|
| `npm run dev` | Дев-сервер (webpack) |
| `npm run build` | Продакшн-билд |
| `npm run update-schema` | Генерация типов из Supabase → types/database.ts |
| `npm run test:automation` | Тест Playwright-автоматизации Kaspi |

## Документация

- `docs/project_info.md` — этот файл
- `docs/problems.md` — список известных проблем и их статус
- `docs/database.md` — структура БД
- `docs/database_*.md` — индексы, триггеры, функции, RLS, enum, cron
