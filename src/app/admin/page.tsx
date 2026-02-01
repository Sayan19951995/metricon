'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CreditCard,
  TrendingUp,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';

type Period = '7d' | '30d' | '90d' | '365d' | 'custom';

// Генерация данных в зависимости от периода
const generateData = (days: number) => {
  const registrations = [];
  const revenue = [];

  for (let i = 0; i < days; i++) {
    const baseReg = 20 + Math.floor(Math.random() * 40);
    const baseRev = (800 + Math.floor(Math.random() * 600)) * 1000;
    registrations.push(baseReg);
    revenue.push(baseRev);
  }

  return { registrations, revenue };
};

const planStats = [
  { name: 'Pro', count: 312, percentage: 35, color: 'bg-purple-500' },
  { name: 'Бизнес', count: 445, percentage: 50, color: 'bg-emerald-500' },
  { name: 'Старт', count: 135, percentage: 15, color: 'bg-blue-500' },
];

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodDays = useMemo(() => {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '365d': return 365;
      case 'custom':
        if (customStart && customEnd) {
          const start = new Date(customStart);
          const end = new Date(customEnd);
          return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }
        return 30;
    }
  }, [period, customStart, customEnd]);

  const { registrations, revenue } = useMemo(() => generateData(periodDays), [periodDays]);

  const stats = useMemo(() => {
    const totalRegistrations = registrations.reduce((a, b) => a + b, 0);
    const totalRevenue = revenue.reduce((a, b) => a + b, 0);

    return {
      totalUsers: 1247,
      activeSubscriptions: 892,
      periodRevenue: totalRevenue,
      newUsersInPeriod: totalRegistrations,
      userGrowth: 12.5,
      revenueGrowth: 18.3,
      subscriptionGrowth: 8.7,
    };
  }, [registrations, revenue]);

  const periodLabels: Record<Period, string> = {
    '7d': '7 дней',
    '30d': '30 дней',
    '90d': '90 дней',
    '365d': '1 год',
    'custom': 'Свой',
  };

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

  const formatRevenue = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B ₸`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₸`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K ₸`;
    return `${amount} ₸`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Админ-панель</h1>
        <p className="text-gray-500 mt-1">Статистика и управление платформой</p>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-500 text-sm">Период:</span>
          {(['7d', '30d', '90d', '365d', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={period}
      >
        {/* Всего пользователей */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              stats.userGrowth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {stats.userGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stats.userGrowth)}%
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Всего пользователей</div>
          </div>
        </motion.div>

        {/* Активных подписок */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              stats.subscriptionGrowth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {stats.subscriptionGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stats.subscriptionGrowth)}%
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Активных подписок</div>
          </div>
        </motion.div>

        {/* Выручка за период */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              stats.revenueGrowth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {stats.revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stats.revenueGrowth)}%
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-gray-900">{formatRevenue(stats.periodRevenue)}</div>
            <div className="text-sm text-gray-500">Выручка за {periodLabels[period]}</div>
          </div>
        </motion.div>

        {/* Новых за период */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-gray-900">+{stats.newUsersInPeriod.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Новых за {periodLabels[period]}</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Регистрации */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-5 shadow-sm"
          key={`reg-${period}`}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Регистрации за {periodLabels[period]}</h3>
          {periodDays <= 14 && (
            <div className="flex gap-1 mb-1">
              {registrations.map((value, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <span className="text-xs text-gray-500">{value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="h-40 flex items-end gap-1">
            {registrations.map((value, idx) => {
              const maxVal = Math.max(...registrations);
              const height = (value / maxVal) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer min-w-[8px]"
                  style={{ height: `${height}%` }}
                  title={`День ${idx + 1}: ${value} регистраций`}
                />
              );
            })}
          </div>
          {periodDays <= 14 ? (
            <div className="flex gap-1 mt-2">
              {registrations.map((_, idx) => (
                <div key={idx} className="flex-1 text-center text-xs text-gray-400">{idx + 1}</div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>1</span>
              <span>{Math.floor(periodDays / 2)}</span>
              <span>{periodDays}</span>
            </div>
          )}
        </motion.div>

        {/* Выручка */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-5 shadow-sm"
          key={`rev-${period}`}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Выручка за {periodLabels[period]}</h3>
          {periodDays <= 14 && (
            <div className="flex gap-1 mb-1">
              {revenue.map((value, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <span className="text-xs text-gray-500">{(value / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          )}
          <div className="h-40 flex items-end gap-1">
            {revenue.map((value, idx) => {
              const maxVal = Math.max(...revenue);
              const height = (value / maxVal) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors cursor-pointer min-w-[8px]"
                  style={{ height: `${height}%` }}
                  title={`День ${idx + 1}: ${(value / 1000).toFixed(0)}k ₸`}
                />
              );
            })}
          </div>
          {periodDays <= 14 ? (
            <div className="flex gap-1 mt-2">
              {revenue.map((_, idx) => (
                <div key={idx} className="flex-1 text-center text-xs text-gray-400">{idx + 1}</div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>1</span>
              <span>{Math.floor(periodDays / 2)}</span>
              <span>{periodDays}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Plan Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl p-5 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Распределение по тарифам</h3>
        <div className="space-y-4">
          {planStats.map((plan) => (
            <div key={plan.name} className="flex items-center gap-4">
              <div className="w-20 text-sm font-medium text-gray-700">{plan.name}</div>
              <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${plan.color} rounded-full flex items-center justify-end pr-3`}
                  style={{ width: `${plan.percentage}%` }}
                >
                  <span className="text-white text-xs font-medium">{plan.count}</span>
                </div>
              </div>
              <div className="w-12 text-right text-sm text-gray-500">{plan.percentage}%</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
