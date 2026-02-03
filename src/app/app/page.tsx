'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bell,
  LogOut,
  TrendingUp,
  Package,
  ShoppingCart,
  Truck,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Warehouse,
  BarChart3,
  HelpCircle,
  Trophy,
  AlertCircle,
  Settings
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface DashboardData {
  sales: {
    weekData: number[];
    prevWeekData: number[];
    ordersPerDay: number[];
    weekGrowth: number;
    todayRevenue: number;
    todayOrders: number;
  };
  month: {
    revenue: number;
    orders: number;
    productsSold: number;
  };
  todayOrders: {
    total: number;
    new: number;
    processing: number;
    shipping: number;
    completed: number;
    revenue: number;
  };
  awaitingPayment: {
    totalAmount: number;
    ordersCount: number;
    notSent: number;
    notSentCount: number;
    inDelivery: number;
    inDeliveryCount: number;
    weeklyPayments: number[];
    weeklyCompletedCount: number[];
  };
  topProducts: Array<{
    name: string;
    sold: number;
    revenue: number;
  }>;
  totals: {
    orders: number;
    products: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGrowthTooltip, setShowGrowthTooltip] = useState(false);
  const [chartTooltip, setChartTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(6);
  const [selectedPaymentDayIdx, setSelectedPaymentDayIdx] = useState<number | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const growthTooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const paymentChartRef = useRef<HTMLDivElement>(null);

  // Данные дашборда
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [kaspiConnected, setKaspiConnected] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Загрузка данных дашборда
  useEffect(() => {
    if (userLoading) return;

    if (!user?.id) {
      setDataLoading(false);
      return;
    }

    async function fetchDashboard() {
      try {
        setDataLoading(true);
        setDataError(null);

        const res = await fetch(`/api/dashboard?userId=${user!.id}`);
        const json = await res.json();

        if (!json.success) {
          setDataError(json.message);
          return;
        }

        setKaspiConnected(json.kaspiConnected);

        if (json.data) {
          setDashboardData(json.data);
        }
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setDataLoading(false);
      }
    }

    fetchDashboard();
  }, [user?.id, userLoading]);

  // Закрытие окна уведомлений и тултипов при клике вне их области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (growthTooltipRef.current && !growthTooltipRef.current.contains(event.target as Node)) {
        setShowGrowthTooltip(false);
      }
      if (chartRef.current && !chartRef.current.contains(event.target as Node)) {
        setChartTooltip(null);
      }
      if (paymentChartRef.current && !paymentChartRef.current.contains(event.target as Node)) {
        setSelectedPaymentDayIdx(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Скелетон-заглушка дашборда
  const DashboardSkeleton = () => (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header skeleton */}
      <div className="flex justify-between items-start gap-4 mb-6 lg:mb-8">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
          <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-4">
        {/* Sales chart skeleton */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          </div>
          {/* Chart area */}
          <div className="relative h-[140px] lg:h-[180px] overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-transparent" />
            <svg className="w-full h-full" viewBox="0 0 400 120">
              <defs>
                <linearGradient id="skelGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#e5e7eb">
                    <animate attributeName="offset" values="-1;2" dur="2s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="50%" stopColor="#d1d5db">
                    <animate attributeName="offset" values="-0.5;2.5" dur="2s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#e5e7eb">
                    <animate attributeName="offset" values="0;3" dur="2s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
              <path d="M 0,90 Q 50,70 100,75 T 200,50 T 300,65 T 400,40" fill="none" stroke="url(#skelGrad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M 0,90 Q 50,70 100,75 T 200,50 T 300,65 T 400,40 L 400,120 L 0,120 Z" fill="url(#skelGrad)" opacity="0.15" />
            </svg>
          </div>
          <div className="flex justify-between mt-3 px-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-3 w-5 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Payments skeleton */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="relative h-[120px] lg:h-[160px] overflow-hidden rounded-lg">
            <svg className="w-full h-full" viewBox="0 0 400 120">
              <path d="M 0,100 Q 60,80 120,85 T 240,55 T 360,70 L 400,50 L 400,120 L 0,120 Z" fill="url(#skelGrad)" opacity="0.15" />
              <path d="M 0,100 Q 60,80 120,85 T 240,55 T 360,70 L 400,50" fill="none" stroke="url(#skelGrad)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex justify-between mt-3 px-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-3 w-5 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Month stats skeleton */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-44 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}px` }} />
                <div className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: `${30 + Math.random() * 30}px` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Top products skeleton */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-28 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="space-y-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 h-3 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="mt-4 lg:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mt-1 hidden sm:block" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Загрузка пользователя или данных
  if (userLoading || dataLoading) {
    return <DashboardSkeleton />;
  }

  // Kaspi не подключен — показываем призыв подключить
  if (!dataLoading && !kaspiConnected) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-start gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Дашборд</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">Обзор ключевых показателей магазина</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto mt-12"
        >
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Kaspi не подключен</h2>
            <p className="text-gray-500 mb-6">
              Чтобы видеть данные на дашборде, подключите свой Kaspi магазин через API
            </p>
            <button
              onClick={() => router.push('/app/settings/kaspi')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5" />
              Подключить Kaspi
            </button>
          </div>
        </motion.div>

        {/* Quick Actions всё равно показываем */}
        <motion.div
          className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { label: 'Заказы', desc: 'Управление заказами', icon: ShoppingCart, color: 'blue', href: '/app/orders' },
            { label: 'Товары', desc: 'Каталог товаров', icon: Package, color: 'emerald', href: '/app/products' },
            { label: 'Аналитика', desc: 'Отчёты и статистика', icon: BarChart3, color: 'purple', href: '/app/analytics' },
            { label: 'Склад', desc: 'Управление запасами', icon: Warehouse, color: 'amber', href: '/app/warehouse' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-${item.color}-100 group-hover:bg-${item.color}-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0`}>
                <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${item.color}-600`} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 block truncate">{item.label}</span>
                <span className="text-xs text-gray-500 hidden sm:block">{item.desc}</span>
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </motion.div>
      </div>
    );
  }

  // Ошибка
  if (dataError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Ошибка загрузки</p>
          <p className="text-gray-500 text-sm mt-1">{dataError}</p>
        </div>
      </div>
    );
  }

  // Если данных нет вообще
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Нет данных</p>
          <p className="text-gray-500 text-sm mt-1">Синхронизируйте данные из Kaspi в настройках</p>
          <button
            onClick={() => router.push('/app/settings/kaspi')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm"
          >
            Настройки Kaspi
          </button>
        </div>
      </div>
    );
  }

  const { sales, awaitingPayment, topProducts } = dashboardData;

  // Проверяем есть ли вообще данные для отображения
  const hasData = sales.weekData.some(v => v > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen lg:max-h-screen lg:overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Дашборд</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Обзор ключевых показателей магазина</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative shrink-0">
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-white rounded-xl transition-colors relative cursor-pointer"
            >
              <Bell className="w-6 h-6 text-gray-600" />
            </button>

            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-12 w-auto sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
              >
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Уведомления</h3>
                </div>
                <div className="p-6 text-center text-gray-400 text-sm">
                  Нет новых уведомлений
                </div>
              </motion.div>
            )}
          </div>
          <button className="p-2 hover:bg-white rounded-xl transition-colors cursor-pointer">
            <LogOut className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Если данных ещё нет после синхронизации */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Данные ещё не синхронизированы</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Перейдите в{' '}
              <button onClick={() => router.push('/app/settings/kaspi')} className="underline cursor-pointer">
                настройки Kaspi
              </button>{' '}
              и нажмите «Синхронизировать»
            </p>
          </div>
        </motion.div>
      )}

      {/* Main Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Продажи - объединённый блок */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-4 shadow-sm overflow-hidden"
        >
          {(() => {
            const selectedRevenue = sales.weekData[selectedDayIdx] || 0;
            const prevWeekRevenue = sales.prevWeekData[selectedDayIdx] || 0;
            const selectedOrders = sales.ordersPerDay[selectedDayIdx] || 0;
            const growth = prevWeekRevenue > 0 ? ((selectedRevenue - prevWeekRevenue) / prevWeekRevenue * 100) : 0;
            const isToday = selectedDayIdx === 6;

            const selectedDate = new Date();
            selectedDate.setDate(selectedDate.getDate() - (6 - selectedDayIdx));
            const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            const dayLabel = isToday ? 'Продажи сегодня' : `Продажи за ${dayNames[selectedDate.getDay()]}, ${selectedDate.getDate()}.${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

            return (
              <div
                className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
                onClick={() => router.push('/app/analytics')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-xs">{dayLabel}</h3>
                    <div className="text-xl font-bold text-gray-900">
                      {selectedRevenue.toLocaleString('ru-RU')} ₸
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {prevWeekRevenue > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
                        growth >= 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {growth >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Math.abs(growth).toFixed(1)}%
                      </div>
                      <div className="relative" ref={growthTooltipRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowGrowthTooltip(!showGrowthTooltip);
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                        {showGrowthTooltip && (
                          <div className="absolute right-0 top-6 z-50 w-52 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                            <p>Изменение продаж по сравнению с тем же днём прошлой недели</p>
                            <div className="absolute -top-1.5 right-2 w-3 h-3 bg-gray-900 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-700">{selectedOrders}</span>
                    <span className="text-xs text-gray-400">заказов</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Линейный график - текущая vs прошлая неделя */}
          <div className="text-[10px] text-gray-400 mb-2 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-500 rounded-full"></span>
              Эта неделя
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-blue-500 rounded-full"></span>
              Прошлая неделя
            </span>
          </div>
          {(() => {
            const currentWeekData = sales.weekData;
            const prevWeekData = sales.prevWeekData;
            const allData = [...currentWeekData, ...prevWeekData].filter(v => v > 0);
            const maxValue = allData.length > 0 ? Math.max(...allData) : 100;
            const minValue = allData.length > 0 ? Math.min(...allData) : 0;
            const chartHeight = 80;
            const padding = 8;
            const pointsCount = currentWeekData.length;

            const getY = (val: number) => {
              const range = maxValue - minValue || 1;
              const normalized = (val - minValue) / range;
              return padding + (1 - normalized) * (chartHeight - padding * 2);
            };

            const yAxisValues = [0, 0.25, 0.5, 0.75, 1].map(ratio =>
              maxValue - ratio * (maxValue - minValue)
            );

            return (
              <div>
                <div className="relative h-[140px] lg:h-[180px] flex">
                <div className="hidden sm:flex flex-col justify-between text-[9px] text-gray-400 pr-1 py-1" style={{ minWidth: '32px' }}>
                  {yAxisValues.map((val, i) => (
                    <span key={i} className="text-right">{Math.round(val / 1000)}k</span>
                  ))}
                </div>
                <div className="flex-1 relative">
                <svg className="w-full h-full" viewBox="0 0 100 80" preserveAspectRatio="none">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = padding + ratio * (chartHeight - padding * 2);
                    return (
                      <line
                        key={`grid-${i}`}
                        x1="0" y1={y} x2="100" y2={y}
                        stroke="#e5e7eb" strokeWidth="1" vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                  <polyline
                    points={prevWeekData.map((val, i) => {
                      const x = 2 + (i / (pointsCount - 1)) * 96;
                      const y = getY(val);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke="#3b82f6" strokeWidth="2"
                    vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"
                  />
                  <polyline
                    points={currentWeekData.map((val, i) => {
                      const x = 2 + (i / (pointsCount - 1)) * 96;
                      const y = getY(val);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke="#10b981" strokeWidth="2"
                    vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {chartTooltip && (
                    <line
                      x1={2 + (chartTooltip.idx / (pointsCount - 1)) * 96} y1={0}
                      x2={2 + (chartTooltip.idx / (pointsCount - 1)) * 96} y2={80}
                      stroke="#9ca3af" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3,3"
                    />
                  )}
                </svg>
                {currentWeekData.map((val, i) => {
                  const xPercent = 2 + (i / (pointsCount - 1)) * 96;
                  const y = getY(val);
                  const isToday = i === pointsCount - 1;
                  const isSelected = i === selectedDayIdx;
                  return (
                    <div key={`current-dot-${i}`}>
                      <div
                        className="absolute cursor-pointer z-10"
                        style={{
                          left: `${xPercent}%`, top: `${(y / 80) * 100}%`,
                          transform: 'translate(-50%, -50%)', width: 24, height: 24,
                        }}
                        onClick={() => setSelectedDayIdx(i)}
                      />
                      <div
                        className="absolute transition-all pointer-events-none"
                        style={{
                          left: `${xPercent}%`, top: `${(y / 80) * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          width: isSelected ? 10 : isToday ? 8 : 6,
                          height: isSelected ? 10 : isToday ? 8 : 6,
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#047857' : isToday ? '#059669' : '#10b981',
                        }}
                      />
                      {isSelected && (
                        <div
                          className="absolute pointer-events-none text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded"
                          style={{
                            left: `${xPercent}%`, top: `${(y / 80) * 100 - 12}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {(val / 1000).toFixed(0)}k
                        </div>
                      )}
                    </div>
                  );
                })}
                {prevWeekData.map((val, i) => {
                  const xPercent = 2 + (i / (pointsCount - 1)) * 96;
                  const y = getY(val);
                  const isToday = i === pointsCount - 1;
                  const isSelected = i === selectedDayIdx;
                  return (
                    <div key={`prev-dot-${i}`}>
                      <div
                        className="absolute cursor-pointer z-10"
                        style={{
                          left: `${xPercent}%`, top: `${(y / 80) * 100}%`,
                          transform: 'translate(-50%, -50%)', width: 24, height: 24,
                        }}
                        onClick={() => setSelectedDayIdx(i)}
                      />
                      <div
                        className="absolute transition-all pointer-events-none"
                        style={{
                          left: `${xPercent}%`, top: `${(y / 80) * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          width: isSelected ? 8 : isToday ? 6 : 5,
                          height: isSelected ? 8 : isToday ? 6 : 5,
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#1d4ed8' : '#3b82f6',
                          opacity: isSelected ? 1 : 0.7,
                        }}
                      />
                      {isSelected && (
                        <div
                          className="absolute pointer-events-none text-[10px] font-semibold text-blue-700 bg-blue-50 px-1 rounded"
                          style={{
                            left: `${xPercent}%`, top: `${(y / 80) * 100 + 12}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {(val / 1000).toFixed(0)}k
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
                </div>

                <div className="flex justify-between mt-2 sm:ml-8" style={{ paddingLeft: '2%', paddingRight: '2%' }}>
                  {currentWeekData.map((currentValue, idx) => {
                    const isToday = idx === currentWeekData.length - 1;
                    const isSelected = idx === selectedDayIdx;
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - idx));
                    const dayNum = date.getDate();
                    return (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setSelectedDayIdx(idx); }}
                        className={`flex flex-col items-center py-1 rounded-lg transition-all cursor-pointer ${
                          isSelected ? 'bg-emerald-100 shadow-sm px-1.5' : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className={`text-[9px] sm:text-[10px] ${isSelected ? 'text-emerald-700 font-semibold' : 'text-emerald-600'}`}>
                          {Math.round(currentValue / 1000)}k
                        </span>
                        <span className={`text-[10px] sm:text-xs ${isSelected ? 'text-emerald-700 font-semibold' : isToday ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                          {dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* Ожидаем платежа / Поступления */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-4 shadow-sm overflow-hidden"
        >
          {(() => {
            const payments = awaitingPayment.weeklyPayments;
            const completedCount = awaitingPayment.weeklyCompletedCount;
            const isShowingPayment = selectedPaymentDayIdx !== null;
            const selectedDate = new Date();
            if (isShowingPayment) {
              selectedDate.setDate(selectedDate.getDate() - (6 - selectedPaymentDayIdx));
            }
            const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

            return (
              <div
                className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
                onClick={() => router.push('/app/orders')}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isShowingPayment ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                  <Truck className={`w-5 h-5 ${isShowingPayment ? 'text-emerald-600' : 'text-indigo-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-500 text-xs">
                    {isShowingPayment
                      ? `Поступило ${dayNames[selectedDate.getDay()]}, ${selectedDate.getDate()}.${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
                      : 'Ожидаем платежа'
                    }
                  </h3>
                  <div className={`text-xl font-bold ${isShowingPayment ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {isShowingPayment
                      ? (payments[selectedPaymentDayIdx!] || 0).toLocaleString('ru-RU')
                      : awaitingPayment.totalAmount.toLocaleString('ru-RU')
                    } ₸
                  </div>
                  {isShowingPayment && (
                    <div className="mt-1 text-xs text-gray-500">
                      Завершено: <span className="font-medium text-gray-700">{completedCount[selectedPaymentDayIdx!] || 0}</span>
                    </div>
                  )}
                </div>
                {!isShowingPayment && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    {awaitingPayment.ordersCount} заказов
                  </div>
                )}
                {isShowingPayment && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedPaymentDayIdx(null); }}
                    className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            );
          })()}

          {selectedPaymentDayIdx === null && (
            <div className="space-y-1.5 text-xs mb-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Не выдано</span>
                <span className="font-medium text-gray-700">{awaitingPayment.notSentCount} шт · {awaitingPayment.notSent.toLocaleString('ru-RU')} ₸</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">В доставке</span>
                <span className="font-medium text-gray-700">{awaitingPayment.inDeliveryCount} шт · {awaitingPayment.inDelivery.toLocaleString('ru-RU')} ₸</span>
              </div>
            </div>
          )}

          {/* График поступлений за неделю */}
          <div className="text-[10px] text-gray-400 mb-1">Поступления за неделю</div>
          {(() => {
            const payments = awaitingPayment.weeklyPayments;
            const nonZero = payments.filter(v => v > 0);
            const maxVal = nonZero.length > 0 ? Math.max(...nonZero) : 100;
            const minVal = nonZero.length > 0 ? Math.min(...nonZero) : 0;
            const chartH = 80;
            const pad = 6;
            const pointsCount = payments.length;

            const getY = (val: number) => {
              const range = maxVal - minVal || 1;
              const norm = (val - minVal) / range;
              return pad + (1 - norm) * (chartH - pad * 2);
            };

            const yAxisValues = [0, 0.25, 0.5, 0.75, 1].map(ratio =>
              maxVal - ratio * (maxVal - minVal)
            );

            return (
              <div>
                <div className="relative h-[120px] lg:h-[160px] flex">
                  <div className="hidden sm:flex flex-col justify-between text-[9px] text-gray-400 pr-1 py-1" style={{ minWidth: '32px' }}>
                    {yAxisValues.map((val, i) => (
                      <span key={i} className="text-right">{Math.round(val / 1000)}k</span>
                    ))}
                  </div>

                  <div className="flex-1 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 80" preserveAspectRatio="none">
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = pad + ratio * (chartH - pad * 2);
                        return (
                          <line key={`grid-${i}`} x1="0" y1={y} x2="100" y2={y}
                            stroke="#e5e7eb" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        );
                      })}
                      <defs>
                        <linearGradient id="paymentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`M 2,${getY(payments[0])} ${payments.map((val, i) => {
                          const x = 2 + (i / (pointsCount - 1)) * 96;
                          const y = getY(val);
                          return `L ${x},${y}`;
                        }).join(' ')} L 98,${chartH} L 2,${chartH} Z`}
                        fill="url(#paymentGradient)"
                      />
                      <polyline
                        points={payments.map((val, i) => {
                          const x = 2 + (i / (pointsCount - 1)) * 96;
                          const y = getY(val);
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none" stroke="#6366f1" strokeWidth="2"
                        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>

                    {payments.map((val, i) => {
                      const xPercent = 2 + (i / (pointsCount - 1)) * 96;
                      const y = getY(val);
                      const isSelected = selectedPaymentDayIdx === i;
                      const isToday = i === pointsCount - 1;
                      return (
                        <div key={`payment-dot-${i}`}>
                          <div
                            className="absolute cursor-pointer z-10"
                            style={{
                              left: `${xPercent}%`, top: `${(y / 80) * 100}%`,
                              transform: 'translate(-50%, -50%)', width: 24, height: 24,
                            }}
                            onClick={() => setSelectedPaymentDayIdx(isSelected ? null : i)}
                          />
                          <div
                            className="absolute transition-all pointer-events-none"
                            style={{
                              left: `${xPercent}%`, top: `${(y / 80) * 100}%`,
                              transform: 'translate(-50%, -50%)',
                              width: isSelected ? 10 : isToday ? 8 : 6,
                              height: isSelected ? 10 : isToday ? 8 : 6,
                              borderRadius: '50%',
                              backgroundColor: isSelected ? '#059669' : '#6366f1',
                            }}
                          />
                          {isSelected && (
                            <div
                              className="absolute pointer-events-none text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1 rounded"
                              style={{
                                left: `${xPercent}%`, top: `${(y / 80) * 100 - 12}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                            >
                              {(val / 1000).toFixed(0)}k
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between mt-2 sm:ml-8" style={{ paddingLeft: '2%', paddingRight: '2%' }}>
                  {payments.map((val, idx) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - idx));
                    const isSelected = selectedPaymentDayIdx === idx;
                    const isToday = idx === payments.length - 1;
                    return (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setSelectedPaymentDayIdx(isSelected ? null : idx); }}
                        className={`flex flex-col items-center py-1 rounded-lg transition-all cursor-pointer ${
                          isSelected ? 'bg-indigo-100 shadow-sm px-1' : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className={`text-[8px] sm:text-[9px] ${isSelected ? 'text-indigo-700 font-semibold' : 'text-indigo-600'}`}>
                          {Math.round(val / 1000)}k
                        </span>
                        <span className={`text-[9px] sm:text-[10px] ${isSelected ? 'text-indigo-700 font-semibold' : isToday ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                          {date.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* Оборот за месяц */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-4 shadow-sm"
        >
          <div
            className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
            onClick={() => router.push('/app/analytics')}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-500 text-xs">Оборот за 30 дней</h3>
              <div className="text-xl font-bold text-gray-900">
                {dashboardData.month.revenue.toLocaleString('ru-RU')} ₸
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Заказов</span>
              <span className="font-medium text-gray-700">{dashboardData.month.orders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Товаров продано</span>
              <span className="font-medium text-gray-700">{dashboardData.month.productsSold}</span>
            </div>
            {dashboardData.month.orders > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Средний чек</span>
                <span className="font-medium text-gray-700">
                  {Math.round(dashboardData.month.revenue / dashboardData.month.orders).toLocaleString('ru-RU')} ₸
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-gray-500">Всего заказов в системе</span>
              <span className="font-medium text-gray-700">{dashboardData.totals.orders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Всего товаров</span>
              <span className="font-medium text-gray-700">{dashboardData.totals.products}</span>
            </div>
          </div>
        </motion.div>

        {/* Топ товаров за неделю */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-4 shadow-sm"
        >
          <div
            className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
            onClick={() => router.push('/app/products')}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-500 text-xs">Топ товаров</h3>
              <div className="text-xl font-bold text-gray-900">
                за неделю
              </div>
            </div>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-1.5 text-xs">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-200 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-700 truncate block">{product.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <span className="font-medium text-gray-900 min-w-[40px] text-right">{product.sold} шт</span>
                    <span className="text-gray-400 min-w-[50px] text-right">
                      · {product.revenue >= 1000000
                        ? `${(product.revenue / 1000000).toFixed(1)}M`
                        : `${Math.round(product.revenue / 1000)}k`
                      } ₸
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-4">
              Нет данных о продажах
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="mt-4 lg:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={() => router.push('/app/orders')}
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 block truncate">Заказы</span>
            <span className="text-xs text-gray-500 hidden sm:block">Управление заказами</span>
          </div>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => router.push('/app/products')}
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 block truncate">Товары</span>
            <span className="text-xs text-gray-500 hidden sm:block">Каталог товаров</span>
          </div>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => router.push('/app/analytics')}
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 block truncate">Аналитика</span>
            <span className="text-xs text-gray-500 hidden sm:block">Отчёты и статистика</span>
          </div>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => router.push('/app/warehouse')}
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-100 group-hover:bg-amber-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
            <Warehouse className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 block truncate">Склад</span>
            <span className="text-xs text-gray-500 hidden sm:block">Управление запасами</span>
          </div>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>
  );
}
