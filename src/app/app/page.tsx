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
  AlertTriangle,
  Megaphone,
  Truck,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Warehouse,
  Calendar,
  BarChart3
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Закрытие окна уведомлений при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Mock данные для дашборда
  const dashboardData = {
    // Продажи за вчера
    yesterdaySales: {
      revenue: 1547800,
      orders: 23,
      avgCheck: 67295,
      growth: 12.5,
      profit: 245000,
      profitMargin: 15.8
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
      revenue: 1285000
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
    }
  };

  // Форматирование суммы
  const formatMoney = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ₸`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K ₸`;
    }
    return `${amount.toLocaleString()} ₸`;
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
                className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Продажи за вчера */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/analytics')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              dashboardData.yesterdaySales.growth >= 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {dashboardData.yesterdaySales.growth >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(dashboardData.yesterdaySales.growth)}%
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">Продажи за вчера</h3>
          <div className="text-2xl font-bold text-gray-900 mb-3">
            {formatMoney(dashboardData.yesterdaySales.revenue)}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{dashboardData.yesterdaySales.orders} заказов</span>
            <span className="text-emerald-600 font-medium">
              Прибыль: {formatMoney(dashboardData.yesterdaySales.profit)}
            </span>
          </div>
        </motion.div>

        {/* Стоимость склада */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/warehouse')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
              {dashboardData.warehouse.totalItems} шт
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">Стоимость склада</h3>
          <div className="text-2xl font-bold text-gray-900 mb-3">
            {formatMoney(dashboardData.warehouse.totalValue)}
          </div>
          <div className="text-sm text-gray-500">
            Средняя цена: {formatMoney(dashboardData.warehouse.avgItemValue)}
          </div>
        </motion.div>

        {/* Заказы на сегодня */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/orders')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-500">{dashboardData.todayOrders.new} новых</span>
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">Заказов на сегодня</h3>
          <div className="text-2xl font-bold text-gray-900 mb-3">
            {dashboardData.todayOrders.total}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-amber-600">{dashboardData.todayOrders.processing} в обработке</span>
            <span className="text-blue-600">{dashboardData.todayOrders.shipping} доставка</span>
          </div>
        </motion.div>

        {/* Оборот за месяц */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-white"
          onClick={() => router.push('/app/analytics')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg text-xs font-medium">
              <ArrowUpRight className="w-3 h-3" />
              {dashboardData.monthTurnover.growth}%
            </div>
          </div>
          <h3 className="text-white/80 text-sm mb-1">Оборот за {new Date().toLocaleString('ru-RU', { month: 'long' })}</h3>
          <div className="text-2xl font-bold mb-3">
            {formatMoney(dashboardData.monthTurnover.revenue)}
          </div>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>{dashboardData.monthTurnover.orders} заказов</span>
            <span>Прибыль: {formatMoney(dashboardData.monthTurnover.profit)}</span>
          </div>
        </motion.div>

        {/* Критический остаток склада */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm sm:col-span-2 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Критический остаток</h3>
                <p className="text-sm text-gray-500">{dashboardData.criticalStock.count} товаров требуют пополнения</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/app/warehouse')}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              Все товары
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {dashboardData.criticalStock.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-red-600 font-semibold">{item.stock} шт</span>
                  <span className="text-xs text-gray-400">мин: {item.minStock}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Рентабельность рекламы */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/analytics')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-amber-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              dashboardData.adsROI.roi >= 100
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}>
              ROI {dashboardData.adsROI.roi}%
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">Рентабельность рекламы</h3>
          <div className="text-2xl font-bold text-gray-900 mb-3">
            {formatMoney(dashboardData.adsROI.revenue)}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Расходы</span>
              <span className="text-red-600 font-medium">{formatMoney(dashboardData.adsROI.spend)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">CPO</span>
              <span className="text-gray-700 font-medium">{formatMoney(dashboardData.adsROI.cpo)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Заказы</span>
              <span className="text-gray-700 font-medium">{dashboardData.adsROI.orders}</span>
            </div>
          </div>
        </motion.div>

        {/* Ожидающие платежи */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/app/warehouse/history')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              В пути
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">Ожидающие платежи</h3>
          <div className="text-2xl font-bold text-gray-900 mb-3">
            {formatMoney(dashboardData.pendingPayments.total)}
          </div>
          <div className="space-y-2">
            {dashboardData.pendingPayments.items.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 truncate max-w-[120px]">{item.supplier}</span>
                <span className="text-indigo-600 font-medium">{formatMoney(item.amount)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
              {dashboardData.pendingPayments.ordersCount} заказов в пути
            </div>
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
