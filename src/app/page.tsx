'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  Zap,
  ArrowRight,
  CheckCircle,
  Star,
  ChevronRight,
  Megaphone,
  Clock,
  Shield,
  Users,
  Sparkles,
  Play,
  Menu,
  X,
  Gift,
  Rocket,
  LineChart,
  PieChart,
  Wallet,
  Bell,
  Settings,
  Globe,
  HeadphonesIcon,
  BookOpen,
  XCircle
} from 'lucide-react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: LineChart,
      title: 'Глубокая аналитика',
      description: 'Продажи, прибыль, маржа, средний чек — все ключевые метрики в реальном времени с графиками.',
      color: 'bg-blue-500'
    },
    {
      icon: PieChart,
      title: 'Финансовые отчёты',
      description: 'P&L, движение денег, детализация по дням. Понимайте реальную прибыль с учётом всех расходов.',
      color: 'bg-emerald-500'
    },
    {
      icon: Package,
      title: 'Управление складом',
      description: 'Учёт остатков и себестоимости, приёмка товаров, пересчёт средневзвешенной цены закупки.',
      color: 'bg-purple-500'
    },
    {
      icon: Megaphone,
      title: 'Анализ рекламы',
      description: 'ROI рекламных кампаний, стоимость привлечения заказа (CPO), эффективность каналов.',
      color: 'bg-amber-500'
    },
    {
      icon: TrendingUp,
      title: 'Дашборд продаж',
      description: 'Обзор ключевых показателей на одном экране: заказы, выручка, ожидаемые платежи, отзывы.',
      color: 'bg-red-500'
    },
    {
      icon: Bell,
      title: 'Умные уведомления',
      description: 'Оповещения о новых заказах, критических остатках, поступлении платежей и отзывах.',
      color: 'bg-indigo-500'
    }
  ];

  const advantages = [
    {
      icon: Zap,
      title: 'Быстрый старт',
      description: 'Подключение за 5 минут. Никаких сложных настроек — просто войдите и начните работать.'
    },
    {
      icon: Shield,
      title: 'Безопасность данных',
      description: 'Шифрование данных, защищённые серверы в Казахстане, соответствие требованиям закона.'
    },
    {
      icon: Globe,
      title: 'Работает везде',
      description: 'Доступ с любого устройства — компьютера, планшета или смартфона, 24/7.'
    },
    {
      icon: HeadphonesIcon,
      title: 'Поддержка 24/7',
      description: 'Оперативная помощь в чате и по телефону. Персональный менеджер на тарифе Pro.'
    }
  ];

  const stats = [
    { value: '1,200+', label: 'Активных продавцов' },
    { value: '₸4.8B', label: 'Оборот клиентов' },
    { value: '47%', label: 'Средний рост продаж' },
    { value: '99.9%', label: 'Uptime платформы' }
  ];

  const testimonials = [
    {
      name: 'Асхат Калиев',
      company: 'TechStore Almaty',
      avatar: 'АК',
      text: 'За 3 месяца использования Metricon наши продажи выросли на 45%. Теперь вижу реальную картину бизнеса и принимаю решения на основе данных.',
      rating: 5,
      result: '+45% продаж'
    },
    {
      name: 'Марина Ким',
      company: 'Fashion House KZ',
      avatar: 'МК',
      text: 'Наконец-то понятная аналитика! Теперь вижу реальную прибыль с учётом всех расходов, а не просто выручку.',
      rating: 5,
      result: '+38% прибыли'
    },
    {
      name: 'Ержан Сулейменов',
      company: 'GadgetWorld',
      avatar: 'ЕС',
      text: 'Дашборд с ключевыми метриками экономит мне 2 часа в день. Всё важное — на одном экране, не нужно копаться в отчётах.',
      rating: 5,
      result: '+52% эффективности'
    }
  ];

  const pricingPlans = [
    {
      name: 'Старт',
      price: '9 900',
      period: 'месяц',
      description: 'Для начинающих продавцов',
      features: [
        'До 30 товаров',
        'Дашборд с базовой статистикой',
        'Управление заказами',
        'Расчёт прибыльности товаров',
        '1 склад',
        'Email уведомления',
        'Аналитика за 7 дней'
      ],
      limitations: [
        'Без P&L отчётов',
        'Без анализа рекламы',
        'Без ролей и сотрудников'
      ],
      popular: false,
      cta: 'Начать'
    },
    {
      name: 'Бизнес',
      price: '14 900',
      oldPrice: '18 900',
      period: 'месяц',
      description: 'Оптимальный выбор для роста',
      features: [
        'До 1 000 товаров',
        'Всё из тарифа "Старт"',
        'Финансовые отчёты P&L',
        'Детализация по дням',
        'Учёт и анализ рекламы (ROI)',
        'До 3 складов',
        'Push + Email уведомления',
        'Аналитика до 30 дней',
        'История приёмок',
        'До 2 ролей (сотрудники)'
      ],
      popular: true,
      badge: 'Скидка 20%',
      cta: 'Выбрать'
    },
    {
      name: 'Pro',
      price: '24 900',
      period: 'месяц',
      description: 'Для крупных магазинов',
      features: [
        'Безлимит товаров',
        'Всё из тарифа "Бизнес"',
        'Безлимит складов',
        'Аналитика за любой период',
        'Экспорт отчётов (Excel, PDF)',
        'Мультиаккаунт (до 3 магазинов)',
        'До 5 ролей (сотрудники)',
        'Приоритетная поддержка',
        'Персональный менеджер'
      ],
      popular: false,
      cta: 'Попробовать бесплатно',
      badge: '14 дней бесплатно'
    }
  ];

  const addOnOptions = [
    {
      name: 'Авторассылка',
      price: '9 900',
      period: 'месяц',
      description: 'Автоматические рассылки клиентам',
      features: [
        'Шаблоны сообщений',
        'Расписание отправки',
        'Напоминания о заказах',
        'Статистика доставки'
      ]
    },
    {
      name: 'Автодемпинг',
      price: '14 900',
      period: 'месяц',
      description: 'Автоматическое управление ценами',
      features: [
        'Мониторинг конкурентов',
        'Стратегии: Undercut, Match, Position',
        'Мин/макс цены, шаг изменения',
        'История изменений цен'
      ]
    }
  ];

  const faqItems = [
    {
      question: 'Как подключить Metricon к моему магазину на Kaspi?',
      answer: 'После регистрации вам нужно ввести API ключ от вашего магазина Kaspi. Инструкция по получению ключа занимает 2 минуты. После этого данные начнут синхронизироваться автоматически.'
    },
    {
      question: 'Безопасно ли передавать данные магазина?',
      answer: 'Да. Все данные передаются по защищённому соединению (HTTPS). Ваши учётные данные хранятся в зашифрованном виде и используются только для синхронизации с Kaspi.'
    },
    {
      question: 'Что входит в 14 дней бесплатного Pro доступа?',
      answer: 'Вы получаете полный доступ ко всем функциям Pro тарифа: безлимит товаров, все отчёты и аналитика, экспорт данных, персональный менеджер и приоритетная поддержка. Карта не требуется.'
    },
    {
      question: 'Могу ли я отменить подписку в любой момент?',
      answer: 'Да, вы можете отменить подписку в любой момент без штрафов. Доступ сохранится до конца оплаченного периода.'
    }
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-b border-gray-100 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Metricon</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Возможности</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Как это работает</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Тарифы</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Отзывы</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">FAQ</a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all text-sm shadow-lg shadow-emerald-500/20"
              >
                Начать бесплатно
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pt-4 pb-2 border-t border-gray-100 mt-4">
              <nav className="flex flex-col gap-2">
                <a href="#features" className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Возможности</a>
                <a href="#how-it-works" className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Как это работает</a>
                <a href="#pricing" className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Тарифы</a>
                <a href="#testimonials" className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Отзывы</a>
                <a href="#faq" className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">FAQ</a>
                <div className="flex gap-2 mt-2">
                  <Link href="/login" className="flex-1 px-4 py-2.5 text-center text-gray-700 border border-gray-200 rounded-xl font-medium">Войти</Link>
                  <Link href="/register" className="flex-1 px-4 py-2.5 text-center bg-emerald-500 text-white rounded-xl font-medium">Начать</Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 right-0 w-[600px] h-[600px] bg-emerald-100/50 rounded-full blur-3xl -translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-3xl translate-y-1/2"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-6">
              <Gift className="w-4 h-4" />
              <span>14 дней Pro доступа бесплатно — без привязки карты</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Аналитика для продавцов{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-600">
                Kaspi.kz
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Metricon — платформа глубокой аналитики для продавцов Kaspi.
              Финансовые отчёты, учёт склада, анализ рекламы и управление заказами в одном месте.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25"
              >
                Попробовать бесплатно
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-lg transition-all border border-gray-200 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Как это работает
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Настройка за 5 минут
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Без привязки карты
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Отмена в любой момент
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-4 flex-1 bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  metricon.kz/app
                </div>
              </div>
              <div className="p-6 bg-gray-50">
                {/* Mini Dashboard */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
                  <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Продажи сегодня</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900">₸1.2M</div>
                    <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />+12%
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Заказов</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900">47</div>
                    <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />+8%
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Прибыль</div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-600">₸186K</div>
                    <div className="text-xs text-gray-500 mt-1">15.5% маржа</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">ROI рекламы</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900">412%</div>
                    <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                      <Sparkles className="w-3 h-3" />Отлично
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium text-gray-700">Динамика продаж</div>
                      <div className="text-xs text-gray-400">Последние 14 дней</div>
                    </div>
                    <div className="flex items-end gap-1.5 h-24">
                      {[35, 45, 40, 60, 55, 75, 65, 80, 70, 85, 75, 90, 85, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all hover:from-emerald-600 hover:to-emerald-500" style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-700 mb-3">Топ товары</div>
                    <div className="space-y-2.5">
                      {[
                        { name: 'iPhone 15 Pro', sales: '₸2.4M' },
                        { name: 'AirPods Pro 2', sales: '₸890K' },
                        { name: 'MacBook Air M2', sales: '₸1.2M' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-xs">{i + 1}</div>
                            <div className="text-xs text-gray-700">{item.name}</div>
                          </div>
                          <div className="text-xs font-medium text-gray-900">{item.sales}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-emerald-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-emerald-100 text-sm sm:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Возможности
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Всё для эффективных продаж
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Инструменты, которые помогут вам продавать больше, зарабатывать больше и тратить меньше времени на рутину
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-4">
              <Rocket className="w-4 h-4" />
              Быстрый старт
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Начните за 5 минут
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Простой процесс подключения — никаких сложных настроек и технических знаний
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Регистрация',
                description: 'Создайте аккаунт за 30 секунд. Нужен только email и пароль.',
                icon: Users
              },
              {
                step: '02',
                title: 'Подключение магазина',
                description: 'Введите API ключ от Kaspi — данные начнут синхронизироваться автоматически.',
                icon: Settings
              },
              {
                step: '03',
                title: 'Анализируйте и растите',
                description: 'Получайте инсайты из данных, оптимизируйте бизнес и увеличивайте прибыль.',
                icon: TrendingUp
              }
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full">
                  <div className="text-5xl font-bold text-emerald-100 mb-4">{item.step}</div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-gray-300">
                    <ChevronRight className="w-8 h-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-4">
                <Shield className="w-4 h-4" />
                Преимущества
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Почему продавцы выбирают Metricon
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Мы создали платформу, которую сами хотели бы использовать — простую, быструю и эффективную.
              </p>

              <div className="space-y-6">
                {advantages.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 right-10 w-40 h-40 bg-white rounded-full blur-2xl"></div>
                <div className="absolute bottom-10 left-10 w-60 h-60 bg-white rounded-full blur-2xl"></div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <Gift className="w-8 h-8" />
                  <span className="text-2xl font-bold">Специальное предложение</span>
                </div>
                <h3 className="text-3xl font-bold mb-4">
                  14 дней Pro доступа бесплатно
                </h3>
                <p className="text-emerald-100 mb-6 text-lg">
                  Попробуйте все функции платформы без ограничений. Никаких скрытых платежей — просто зарегистрируйтесь и начните.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Безлимит товаров', 'Все интеграции', 'Персональный менеджер', 'Приоритетная поддержка'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-200" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
                >
                  Активировать бесплатно
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-4">
              <Star className="w-4 h-4" />
              Отзывы
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Что говорят наши клиенты
            </h2>
            <p className="text-lg text-gray-600">
              Реальные результаты от реальных продавцов
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.company}</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                    {testimonial.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-4">
              <Wallet className="w-4 h-4" />
              Тарифы
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Простые и понятные цены
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Выберите тариф под размер вашего бизнеса. Все тарифы включают базовые функции.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-2xl p-6 border-2 relative ${
                  plan.popular
                    ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 scale-105'
                    : 'border-gray-100'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-full whitespace-nowrap">
                    ПОПУЛЯРНЫЙ ВЫБОР
                  </div>
                )}
                {plan.badge && !plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-full whitespace-nowrap flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" />
                    {plan.badge}
                  </div>
                )}
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    {plan.oldPrice && (
                      <span className="text-xl text-gray-400 line-through">{plan.oldPrice} ₸</span>
                    )}
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">₸/{plan.period}</span>
                  </div>
                  {plan.badge && plan.popular && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                      {plan.badge}
                    </div>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation, i) => (
                    <li key={`lim-${i}`} className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-400 text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {plan.cta}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>

          {/* Дополнительные опции */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-6">
              Дополнительные опции к любому тарифу
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {addOnOptions.map((addon, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-5 border border-gray-200 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{addon.name}</h4>
                      <p className="text-gray-500 text-sm">{addon.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-emerald-600">+{addon.price} ₸</span>
                      <span className="text-gray-400 text-sm">/{addon.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {addon.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-gray-500 mt-8 text-sm">
            Все цены указаны без НДС. Оплата помесячно, отмена в любой момент.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              FAQ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Часто задаваемые вопросы
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span className="font-medium text-gray-900">{item.question}</span>
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${openFaq === idx ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-500 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium mb-6">
              <Rocket className="w-4 h-4" />
              Присоединяйтесь к 1,200+ продавцам
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Готовы увеличить продажи на Kaspi?
            </h2>
            <p className="text-xl text-emerald-100 mb-8">
              Начните с 14 дней бесплатного Pro доступа. Без привязки карты, без обязательств.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-100 text-emerald-600 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-xl"
              >
                Начать бесплатно
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-lg transition-all border border-white/30 flex items-center justify-center"
              >
                Войти в аккаунт
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Metricon</span>
              </Link>
              <p className="text-gray-400 text-sm mb-4 max-w-xs">
                Платформа глубокой аналитики для продавцов Kaspi.kz. Принимайте решения на основе данных.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                Данные защищены
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Продукт</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Возможности</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Тарифы</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Интеграции</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Обновления</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Компания</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">О нас</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Блог</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Вакансии</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Контакты</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Поддержка</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Документация</a></li>
                <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Связаться</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Статус системы</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 Metricon. Все права защищены.
            </p>
            <div className="flex items-center gap-6">
              <a href="/terms" className="text-gray-500 hover:text-white text-sm transition-colors">Условия использования</a>
              <a href="/privacy" className="text-gray-500 hover:text-white text-sm transition-colors">Политика конфиденциальности</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
