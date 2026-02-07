'use client';

import { useState } from 'react';
import Link from 'next/link';

// Интерфейсы
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  period: string;
  pricePerMonth: number;
  features: string[];
  limitations?: string[];
  popular?: boolean;
  current?: boolean;
  badge?: string;
}

interface AddOnOption {
  id: string;
  name: string;
  price: number | { start: number; business: number; pro: number };
  description: string;
  features: string[];
  active?: boolean;
}

// Данные планов подписки
const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'start',
    name: 'Старт',
    price: 9900,
    period: 'месяц',
    pricePerMonth: 9900,
    features: [
      'До 50 товаров',
      'Дашборд с базовой статистикой',
      'Управление заказами',
      'Расчёт прибыльности товаров',
      '1 склад',
      'Email уведомления',
      'Аналитика за 7 дней',
    ],
    limitations: [
      'Без P&L отчётов',
      'Без анализа рекламы',
      'Без ролей и сотрудников',
    ],
  },
  {
    id: 'business',
    name: 'Бизнес',
    price: 14900,
    oldPrice: 18900,
    period: 'месяц',
    pricePerMonth: 14900,
    features: [
      'До 200 товаров',
      'Всё из тарифа "Старт"',
      'Финансовые отчёты P&L',
      'Детализация по дням',
      'Учёт и анализ рекламы (ROI)',
      'До 3 складов',
      'Push + Email уведомления',
      'Аналитика до 30 дней',
      'История приёмок',
      'До 2 ролей (сотрудники)',
    ],
    popular: true,
    current: true,
    badge: 'Скидка 20%',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 24900,
    period: 'месяц',
    pricePerMonth: 24900,
    features: [
      'Безлимит товаров',
      'Всё из тарифа "Бизнес"',
      'Безлимит складов',
      'Аналитика за любой период',
      'Экспорт отчётов (Excel, PDF)',
      'Мультиаккаунт (до 3 магазинов)',
      'До 5 ролей (сотрудники)',
      'Приоритетная поддержка',
      'Персональный менеджер',
    ],
    badge: '14 дней бесплатно',
  },
];

// Дополнительные опции
const addOnOptions: AddOnOption[] = [
  {
    id: 'preorder',
    name: 'Предзаказ',
    price: 12900,
    description: 'Управление предзаказами товаров',
    features: [
      'Автоприём предзаказов',
      'Уведомления о новых предзаказах',
      'Автообновление статусов',
      'Лимит товаров = ваш тариф',
    ],
    active: false,
  },
  {
    id: 'auto-mailing',
    name: 'Авторассылка',
    price: 12900,
    description: 'Автоматические рассылки клиентам',
    features: [
      'Шаблоны сообщений',
      'Расписание отправки',
      'Напоминания о заказах',
      'Лимит товаров = ваш тариф',
    ],
    active: false,
  },
  {
    id: 'auto-pricing',
    name: 'Автодемпинг',
    price: { start: 14990, business: 19990, pro: 24990 },
    description: 'Автоматическое управление ценами',
    features: [
      'Мониторинг конкурентов',
      'Стратегии: Undercut, Match, Position',
      'Мин/макс цены, шаг изменения',
      'Цена зависит от тарифа',
    ],
    active: false,
  },
];

// Текущая подписка (mock данные)
const currentSubscription = {
  plan: 'Бизнес',
  startDate: '2025-01-15',
  endDate: '2025-02-15',
  autoRenew: true,
  nextPayment: 14900,
};

export default function SubscriptionPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Расчёт цен с учётом периода
  const getPrice = (plan: SubscriptionPlan) => {
    if (billingPeriod === 'yearly') {
      return Math.round(plan.price * 10); // 2 месяца бесплатно
    }
    return plan.price;
  };

  // Получение цены аддона в зависимости от тарифа
  const getAddonPrice = (addon: AddOnOption) => {
    if (typeof addon.price === 'number') {
      return addon.price;
    }
    // Определяем текущий тариф
    const planName = currentSubscription.plan.toLowerCase();
    if (planName === 'старт' || planName === 'start') return addon.price.start;
    if (planName === 'бизнес' || planName === 'business') return addon.price.business;
    if (planName === 'pro' || planName === 'про') return addon.price.pro;
    return addon.price.start; // по умолчанию
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const daysUntilExpiry = () => {
    const end = new Date(currentSubscription.endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Link href="/app" className="hover:text-gray-700 dark:hover:text-gray-300">Дашборд</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Подписка</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Управление подпиской</h1>
        </div>

        {/* Текущий план */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 lg:p-8 mb-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/70 text-sm">Текущий план</p>
                  <h2 className="text-2xl font-bold">{currentSubscription.plan}</h2>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-white/80">
                  <span className="text-white/60">Активен до:</span>{' '}
                  <span className="font-semibold">{formatDate(currentSubscription.endDate)}</span>
                </p>
                <p className="text-white/80">
                  <span className="text-white/60">Осталось:</span>{' '}
                  <span className="font-semibold">{daysUntilExpiry()} дней</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="bg-white/10 rounded-xl px-6 py-4 text-center">
                <p className="text-white/60 text-sm mb-1">Следующий платёж</p>
                <p className="text-2xl font-bold">{currentSubscription.nextPayment.toLocaleString('ru-RU')} ₸</p>
                <p className="text-white/60 text-xs mt-1">{formatDate(currentSubscription.endDate)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-medium hover:bg-white/90 transition-colors">
                  Продлить сейчас
                </button>
                <button className="px-6 py-2 text-white/80 hover:text-white text-sm transition-colors">
                  Отменить подписку
                </button>
              </div>
            </div>
          </div>

          {/* Прогресс-бар */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-white/70 mb-2">
              <span>Начало: {formatDate(currentSubscription.startDate)}</span>
              <span>Окончание: {formatDate(currentSubscription.endDate)}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, 100 - (daysUntilExpiry() / 30 * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Переключатель периода */}
        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm inline-flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-gray-900 dark:bg-gray-700 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Ежемесячно
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? 'bg-gray-900 dark:bg-gray-700 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Ежегодно
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Планы */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-sm border-2 transition-all hover:shadow-lg ${
                plan.current
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : plan.popular
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    ПОПУЛЯРНЫЙ ВЫБОР
                  </span>
                </div>
              )}

              {plan.current && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Текущий
                  </span>
                </div>
              )}

              {plan.badge && !plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium px-4 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-2">
                  {plan.oldPrice && (
                    <span className="text-lg text-gray-400 dark:text-gray-500 line-through">
                      {plan.oldPrice.toLocaleString('ru-RU')} ₸
                    </span>
                  )}
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {getPrice(plan).toLocaleString('ru-RU')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">₸</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {billingPeriod === 'yearly' ? 'в год' : 'в месяц'}
                </p>
                {billingPeriod === 'yearly' && (
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-1">
                    {Math.round(plan.price * 10 / 12).toLocaleString('ru-RU')} ₸/мес
                  </p>
                )}
                {plan.badge && plan.popular && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                    {plan.badge}
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">{feature}</span>
                  </li>
                ))}
                {plan.limitations?.map((limitation, i) => (
                  <li key={`lim-${i}`} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-gray-400 dark:text-gray-500 text-sm">{limitation}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  plan.current
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
                    : plan.popular
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                    : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600'
                }`}
                disabled={plan.current}
              >
                {plan.current ? 'Текущий план' : 'Выбрать план'}
              </button>
            </div>
          ))}
        </div>

        {/* Дополнительные опции */}
        <div className="mt-12">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Дополнительные опции
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            Подключите к любому тарифу для расширения возможностей
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {addOnOptions.map((addon) => (
              <div
                key={addon.id}
                className={`relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 transition-all hover:shadow-lg ${
                  addon.active ? 'border-emerald-500' : 'border-gray-100 dark:border-gray-700'
                }`}
              >
                {addon.active && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Активно
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{addon.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{addon.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+{getAddonPrice(addon).toLocaleString('ru-RU')} ₸</span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm">/мес</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {addon.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-2.5 rounded-lg font-medium transition-all ${
                    addon.active
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {addon.active ? 'Отключить' : 'Подключить'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 lg:mt-16">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Часто задаваемые вопросы
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: 'Как работает оплата?',
                a: 'Оплата происходит автоматически в начале каждого периода. Вы можете отменить подписку в любой момент, и она будет активна до конца оплаченного периода.',
              },
              {
                q: 'Могу ли я сменить план?',
                a: 'Да, вы можете перейти на другой план в любое время. При повышении плана разница будет рассчитана пропорционально. При понижении новый план вступит в силу со следующего периода.',
              },
              {
                q: 'Что произойдёт, если я превышу лимиты?',
                a: 'Мы уведомим вас заранее. Вы сможете либо удалить часть товаров, либо перейти на план с большим лимитом.',
              },
              {
                q: 'Есть ли пробный период?',
                a: 'Да, для новых пользователей доступен бесплатный пробный период 14 дней на плане Pro с полным доступом ко всем функциям.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.q}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Контакт */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Нужна помощь с выбором плана?
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Связаться с поддержкой
          </button>
        </div>
      </div>
    </div>
  );
}
