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
  Star,
  Trophy
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGrowthTooltip, setShowGrowthTooltip] = useState(false);
  const [chartTooltip, setChartTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(6); // По умолчанию сегодня (последний день)
  const notificationsRef = useRef<HTMLDivElement>(null);
  const growthTooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Закрытие окна уведомлений и тултипа при клике вне их области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (growthTooltipRef.current && !growthTooltipRef.current.contains(event.target as Node)) {
        setShowGrowthTooltip(false);
      }
    };

    if (showNotifications || showGrowthTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showGrowthTooltip]);

  // Mock данные для дашборда
  const dashboardData = {
    // Продажи за вчера
    yesterdaySales: {
      revenue: 1547800,
      orders: 23,
      avgCheck: 67295,
      growth: 12.5,
      profit: 245000,
      profitMargin: 15.8,
      // Данные за текущую неделю (Пн-Вс)
      weekData: [980000, 1250000, 1120000, 1450000, 1680000, 1890000, 1547800],
      // Данные за прошлую неделю (для сравнения)
      prevWeekData: [870000, 1180000, 1050000, 1320000, 1490000, 1680000, 1375000],
      // Заказы по дням текущей недели
      ordersPerDay: [12, 15, 14, 19, 22, 25, 18]
    },
    // Стоимость склада
    warehouse: {
      totalValue: 48750000,
      totalItems: 1247,
      avgItemValue: 39095
    },
    // Заказы на сегодня
    todayOrders: {
      total: 18,
      new: 7,
      processing: 8,
      shipping: 3,
      revenue: 1285000,
      // Данные за неделю (Пн-Вс)
      weekData: [12, 15, 14, 19, 22, 25, 18]
    },
    // Оборот за месяц
    monthTurnover: {
      revenue: 38500000,
      orders: 542,
      growth: 22.7,
      profit: 5915000,
      profitMargin: 15.4
    },
    // Критический остаток
    criticalStock: {
      count: 8,
      items: [
        { name: 'iPhone 14 Pro 256GB', stock: 2, minStock: 10 },
        { name: 'AirPods Pro 2', stock: 3, minStock: 15 },
        { name: 'MacBook Air M2', stock: 1, minStock: 5 },
        { name: 'Apple Watch Ultra', stock: 4, minStock: 10 },
        { name: 'Samsung Galaxy S23', stock: 2, minStock: 8 }
      ]
    },
    // Рентабельность рекламы
    adsROI: {
      spend: 850000,
      revenue: 4250000,
      roi: 400,
      orders: 89,
      cpo: 9550 // cost per order
    },
    // Ожидающие платежи
    pendingPayments: {
      total: 12850000,
      ordersCount: 156,
      items: [
        { orderId: 'ORD-2025-004', supplier: 'Apple Inc.', amount: 16140000, expectedDate: '2025-10-28' },
        { orderId: 'ORD-2025-003', supplier: 'Apple Inc.', amount: 3540000, expectedDate: '2025-11-08' }
      ]
    },
    // Ожидаем платежа (заказы от клиентов)
    awaitingPayment: {
      totalAmount: 4978800,
      ordersCount: 12,
      notSent: 2150000,        // Не отправлено
      notSentCount: 5,         // Кол-во не отправленных
      inDelivery: 2828800,     // Передано на доставку
      inDeliveryCount: 7,      // Кол-во в доставке
      // Поступления за неделю (Пн-Вс)
      weeklyPayments: [850000, 1120000, 780000, 1450000, 920000, 1680000, 1178800]
    },
    // Отзывы за неделю
    reviews: {
      total: 47,
      positive: 38,   // 5 звёзд
      good: 6,        // 4 звезды
      negative: 3     // 1-3 звезды
    },
    // Топ товаров за неделю (топ 3)
    topProducts: [
      { name: 'iPhone 14 Pro 256GB', sold: 45, revenue: 44955000 },
      { name: 'AirPods Pro 2', sold: 38, revenue: 3420000 },
      { name: 'MacBook Air M2', sold: 12, revenue: 17988000 }
    ]
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Дэшборд</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Обзор ключевых показателей магазина</p>
        </div>

        <div className="flex items-center gap-4 relative">
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-white rounded-xl transition-colors relative cursor-pointer"
            >
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
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
                  <button className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer">
                    Очистить
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Новый заказ #1247</p>
                        <p className="text-xs text-gray-500 mt-1">iPhone 14 Pro - 3 шт.</p>
                        <p className="text-xs text-gray-400 mt-1">5 минут назад</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Низкий остаток</p>
                        <p className="text-xs text-gray-500 mt-1">AirPods Pro 2 - осталось 3 шт.</p>
                        <p className="text-xs text-gray-400 mt-1">1 час назад</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Товар прибыл</p>
                        <p className="text-xs text-gray-500 mt-1">ORD-2025-001 получен на склад</p>
                        <p className="text-xs text-gray-400 mt-1">3 часа назад</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-200">
                  <button
                    onClick={() => router.push('/app/notifications')}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    Посмотреть все
                  </button>
                </div>
              </motion.div>
            )}
          </div>
          <button className="p-2 hover:bg-white rounded-xl transition-colors cursor-pointer">
            <LogOut className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Продажи - объединённый блок */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/analytics')}
        >
          {/* Заголовок с суммой и количеством */}
          {(() => {
            const selectedRevenue = dashboardData.yesterdaySales.weekData[selectedDayIdx];
            const prevWeekRevenue = dashboardData.yesterdaySales.prevWeekData[selectedDayIdx];
            const selectedOrders = dashboardData.yesterdaySales.ordersPerDay[selectedDayIdx];
            const growth = prevWeekRevenue > 0 ? ((selectedRevenue - prevWeekRevenue) / prevWeekRevenue * 100) : 0;
            const isToday = selectedDayIdx === 6;

            // Получаем дату для выбранного дня
            const selectedDate = new Date();
            selectedDate.setDate(selectedDate.getDate() - (6 - selectedDayIdx));
            const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            const dayLabel = isToday ? 'Продажи сегодня' : `Продажи за ${dayNames[selectedDate.getDay()]}, ${selectedDate.getDate()}.${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

            return (
              <div className="flex items-center justify-between mb-4">
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
            const currentWeekData = dashboardData.yesterdaySales.weekData;
            const prevWeekData = dashboardData.yesterdaySales.prevWeekData;
            const allData = [...currentWeekData, ...prevWeekData];
            const maxValue = Math.max(...allData);
            const minValue = Math.min(...allData);
            const chartHeight = 80;
            const padding = 8;
            const pointsCount = currentWeekData.length;

            // Единая функция для расчёта Y (обе линии на одной шкале)
            const getY = (val: number) => {
              const range = maxValue - minValue || 1;
              const normalized = (val - minValue) / range;
              return padding + (1 - normalized) * (chartHeight - padding * 2);
            };

            // Значения для Y-оси (3 уровня)
            const yAxisValues = [maxValue, (maxValue + minValue) / 2, minValue];

            return (
              <div ref={chartRef} onMouseLeave={() => setChartTooltip(null)}>
                {/* Контейнер графика с фиксированной высотой */}
                <div className="relative h-[100px] flex">
                {/* Y-ось слева */}
                <div className="flex flex-col justify-between text-[9px] text-gray-400 pr-1 py-1" style={{ minWidth: '32px' }}>
                  {yAxisValues.map((val, i) => (
                    <span key={i} className="text-right">{Math.round(val / 1000)}k</span>
                  ))}
                </div>
                {/* Область графика */}
                <div className="flex-1 relative">
                <svg className="w-full h-full" viewBox="0 0 100 80" preserveAspectRatio="none">
                  {/* Линия прошлой недели (синяя, снизу) */}
                  <polyline
                    points={prevWeekData.map((val, i) => {
                      const x = 2 + (i / (pointsCount - 1)) * 96;
                      const y = getY(val);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.7"
                  />
                  {/* Линия текущей недели (зелёная, сверху) */}
                  <polyline
                    points={currentWeekData.map((val, i) => {
                      const x = 2 + (i / (pointsCount - 1)) * 96;
                      const y = getY(val);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Вертикальная линия при наведении */}
                  {chartTooltip && (
                    <line
                      x1={2 + (chartTooltip.idx / (pointsCount - 1)) * 96}
                      y1={0}
                      x2={2 + (chartTooltip.idx / (pointsCount - 1)) * 96}
                      y2={80}
                      stroke="#9ca3af"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="3,3"
                    />
                  )}
                </svg>
                {/* Точки текущей недели */}
                {currentWeekData.map((val, i) => {
                  const xPercent = 2 + (i / (pointsCount - 1)) * 96;
                  const y = getY(val);
                  const isToday = i === pointsCount - 1;
                  const isHovered = chartTooltip?.idx === i;
                  return (
                    <div
                      key={`current-dot-${i}`}
                      className="absolute cursor-pointer transition-all"
                      style={{
                        left: `${xPercent}%`,
                        top: `${(y / 80) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: isHovered ? 12 : isToday ? 8 : 6,
                        height: isHovered ? 12 : isToday ? 8 : 6,
                        borderRadius: '50%',
                        backgroundColor: isHovered ? '#047857' : isToday ? '#059669' : '#10b981',
                      }}
                      onMouseEnter={(e) => {
                        const rect = chartRef.current?.getBoundingClientRect();
                        if (rect) {
                          setChartTooltip({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChartTooltip(chartTooltip?.idx === i ? null : { idx: i, x: xPercent, y });
                      }}
                    />
                  );
                })}
                {/* Точки прошлой недели */}
                {prevWeekData.map((val, i) => {
                  const xPercent = 2 + (i / (pointsCount - 1)) * 96;
                  const y = getY(val);
                  const isToday = i === pointsCount - 1;
                  const isHovered = chartTooltip?.idx === i;
                  return (
                    <div
                      key={`prev-dot-${i}`}
                      className="absolute cursor-pointer transition-all"
                      style={{
                        left: `${xPercent}%`,
                        top: `${(y / 80) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: isHovered ? 10 : isToday ? 6 : 5,
                        height: isHovered ? 10 : isToday ? 6 : 5,
                        borderRadius: '50%',
                        backgroundColor: isHovered ? '#1d4ed8' : '#3b82f6',
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) => {
                        const rect = chartRef.current?.getBoundingClientRect();
                        if (rect) {
                          setChartTooltip({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChartTooltip(chartTooltip?.idx === i ? null : { idx: i, x: xPercent, y });
                      }}
                    />
                  );
                })}

                {/* Тултип при наведении */}
                {chartTooltip && (
                  <div
                    className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none"
                    style={{
                      left: Math.min(chartTooltip.x, 200),
                      top: -50,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {(() => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - chartTooltip.idx));
                      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                      return (
                        <div className="text-center">
                          <div className="font-medium mb-1">
                            {dayNames[date.getDay()]}, {date.getDate()}.{String(date.getMonth() + 1).padStart(2, '0')}
                          </div>
                          <div className="flex items-center gap-2 text-emerald-400">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                            Эта: {currentWeekData[chartTooltip.idx].toLocaleString('ru-RU')} ₸
                          </div>
                          <div className="flex items-center gap-2 text-blue-400">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            Прошлая: {prevWeekData[chartTooltip.idx].toLocaleString('ru-RU')} ₸
                          </div>
                          {(() => {
                            const current = currentWeekData[chartTooltip.idx];
                            const prev = prevWeekData[chartTooltip.idx];
                            const diff = prev > 0 ? ((current - prev) / prev * 100).toFixed(0) : 0;
                            const isPositive = current >= prev;
                            return (
                              <div className={`text-center mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isPositive ? '+' : ''}{diff}%
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-3 h-3 bg-gray-900 rotate-45"></div>
                  </div>
                )}
                </div>
                </div>

                {/* Подписи дат и значений - кликабельные */}
                <div className="flex justify-between mt-2">
                  {currentWeekData.map((currentValue, idx) => {
                    const prevValue = prevWeekData[idx];
                    const isToday = idx === currentWeekData.length - 1;
                    const isSelected = idx === selectedDayIdx;
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - idx));
                    const dayNum = date.getDate();
                    return (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayIdx(idx);
                        }}
                        className={`flex flex-col items-center px-1.5 py-1 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-emerald-100 shadow-sm'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex gap-0.5">
                          <span className={`text-[10px] ${isSelected ? 'text-emerald-700 font-semibold' : 'text-emerald-600'}`}>
                            {Math.round(currentValue / 1000)}
                          </span>
                          <span className="text-[10px] text-gray-300">/</span>
                          <span className={`text-[10px] ${isSelected ? 'text-blue-700 font-semibold' : 'text-blue-600'}`}>
                            {Math.round(prevValue / 1000)}
                          </span>
                        </div>
                        <span className={`text-xs ${isSelected ? 'text-emerald-700 font-semibold' : isToday ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
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

        {/* Ожидаем платежа */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/orders')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-500 text-xs">Ожидаем платежа</h3>
              <div className="text-xl font-bold text-gray-900">
                {dashboardData.awaitingPayment.totalAmount.toLocaleString('ru-RU')} ₸
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
              {dashboardData.awaitingPayment.ordersCount} заказов
            </div>
          </div>
          {/* Список статусов */}
          <div className="space-y-1.5 text-xs mb-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Не отправлено</span>
              <span className="font-medium text-gray-700">{dashboardData.awaitingPayment.notSentCount} шт · {dashboardData.awaitingPayment.notSent.toLocaleString('ru-RU')} ₸</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Передано на доставку</span>
              <span className="font-medium text-gray-700">{dashboardData.awaitingPayment.inDeliveryCount} шт · {dashboardData.awaitingPayment.inDelivery.toLocaleString('ru-RU')} ₸</span>
            </div>
          </div>

          {/* График поступлений за неделю */}
          <div className="text-[10px] text-gray-400 mb-1">Поступления за неделю</div>
          {(() => {
            const payments = dashboardData.awaitingPayment.weeklyPayments;
            const maxVal = Math.max(...payments);
            const minVal = Math.min(...payments);
            const chartH = 50;
            const pad = 6;

            const getY = (val: number) => {
              const range = maxVal - minVal || 1;
              const norm = (val - minVal) / range;
              return pad + (1 - norm) * (chartH - pad * 2);
            };

            return (
              <div className="relative h-[60px]">
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  {/* Градиент заливки */}
                  <defs>
                    <linearGradient id="paymentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  {/* Заливка под линией */}
                  <path
                    d={`M 2,${getY(payments[0])} ${payments.map((val, i) => {
                      const x = 2 + (i / (payments.length - 1)) * 96;
                      const y = getY(val);
                      return `L ${x},${y}`;
                    }).join(' ')} L 98,${chartH} L 2,${chartH} Z`}
                    fill="url(#paymentGradient)"
                  />
                  {/* Линия */}
                  <polyline
                    points={payments.map((val, i) => {
                      const x = 2 + (i / (payments.length - 1)) * 96;
                      const y = getY(val);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {/* Подписи дней */}
                <div className="flex justify-between mt-1">
                  {payments.map((val, idx) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - idx));
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <span className="text-[9px] text-indigo-600">{Math.round(val / 1000)}k</span>
                        <span className="text-[10px] text-gray-400">{date.getDate()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* Отзывы за неделю */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/analytics?tab=reviews')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-500 text-xs">Отзывы за неделю</h3>
              <div className="text-xl font-bold text-gray-900">
                {dashboardData.reviews.total}
              </div>
            </div>
          </div>
          {/* Распределение отзывов */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-gray-500">Положительные</span>
              </span>
              <span className="font-medium text-emerald-600">{dashboardData.reviews.positive}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-gray-500">Хорошие</span>
              </span>
              <span className="font-medium text-amber-600">{dashboardData.reviews.good}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-gray-500">Отрицательные</span>
              </span>
              <span className="font-medium text-red-600">{dashboardData.reviews.negative}</span>
            </div>
          </div>
        </motion.div>

        {/* Топ товаров за неделю */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/products')}
        >
          <div className="flex items-center gap-3 mb-3">
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
          {/* Список топ товаров */}
          <div className="space-y-1.5 text-xs">
            {dashboardData.topProducts.map((product, index) => (
              <div
                key={index}
                className="flex items-center gap-2"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-700' :
                  index === 1 ? 'bg-gray-200 text-gray-600' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700 truncate block">{product.name}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-medium text-gray-900">{product.sold} шт</span>
                  <span className="text-gray-400 ml-1">· {(product.revenue / 1000000).toFixed(1)}M ₸</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="mt-6 lg:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"
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
