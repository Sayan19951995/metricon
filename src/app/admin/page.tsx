'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, CreditCard, TrendingUp, UserPlus, Store, Loader2,
  DollarSign, ArrowRight, UserCheck, Wifi, ChevronRight,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface ActivityEvent {
  type: string;
  name: string;
  email: string;
  date: string;
  detail?: string;
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalStores: number;
  kaspiConnected: number;
  newUsersLast30Days: number;
  planDistribution: Record<string, number>;
  registrations: { date: string; count: number }[];
  conversionFunnel: { registered: number; subscribed: number; kaspiConnected: number };
  mrr: number;
  recentActivity: ActivityEvent[];
  latestUsers: { id: string; name: string; email: string; createdAt: string }[];
}

const planLabels: Record<string, string> = {
  start: 'Старт',
  business: 'Бизнес',
  pro: 'Pro',
};

const planColors: Record<string, string> = {
  start: 'bg-blue-500',
  business: 'bg-emerald-500',
  pro: 'bg-purple-500',
};

function formatMoney(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} д назад`;
  return `${Math.floor(days / 30)} мес назад`;
}

const activityConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  registration: {
    icon: <UserPlus className="w-4 h-4" />,
    color: 'bg-blue-500/20 text-blue-400',
    label: 'зарегистрировался',
  },
  subscription: {
    icon: <CreditCard className="w-4 h-4" />,
    color: 'bg-emerald-500/20 text-emerald-400',
    label: 'оформил подписку',
  },
  kaspi_connected: {
    icon: <Wifi className="w-4 h-4" />,
    color: 'bg-purple-500/20 text-purple-400',
    label: 'подключил Kaspi',
  },
};

export default function AdminDashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchStats();
  }, [user?.id]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Admin stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Админ-панель</h1>
          <p className="text-gray-500 mt-1">Статистика и управление платформой</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  // Plan distribution
  const totalSubs = Object.values(stats.planDistribution).reduce((a, b) => a + b, 0) || 1;
  const planEntries = Object.entries(stats.planDistribution).map(([plan, count]) => ({
    plan,
    label: planLabels[plan] || plan,
    count,
    percentage: Math.round((count / totalSubs) * 100),
    color: planColors[plan] || 'bg-gray-500',
  })).sort((a, b) => b.count - a.count);

  // Registration chart
  const maxReg = Math.max(...stats.registrations.map(r => r.count), 1);

  // Funnel percentages
  const funnelSteps = [
    { label: 'Зарегистрированы', value: stats.conversionFunnel.registered, color: 'bg-blue-500' },
    { label: 'С подпиской', value: stats.conversionFunnel.subscribed, color: 'bg-emerald-500' },
    { label: 'Kaspi подключён', value: stats.conversionFunnel.kaspiConnected, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header with quick actions */}
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Админ-панель</h1>
          <p className="text-gray-500 mt-1">Статистика и управление платформой</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors shadow-sm"
          >
            <Users className="w-4 h-4" />
            Пользователи
          </Link>
          <Link
            href="/admin/subscriptions"
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 rounded-xl text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            Подписки
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
              +{stats.newUsersLast30Days} за 30д
            </span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
          <div className="text-sm text-gray-500">Пользователей</div>
        </div>

        <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
              {stats.totalUsers > 0 ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) : 0}% конверсия
            </span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.activeSubscriptions}</div>
          <div className="text-sm text-gray-500">Активных подписок</div>
        </div>

        <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.kaspiConnected} <span className="text-sm text-gray-400 font-normal">/ {stats.totalStores}</span>
          </div>
          <div className="text-sm text-gray-500">Kaspi подключён</div>
        </div>

        <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
              в месяц
            </span>
          </div>
          <div className="text-2xl font-bold text-white">{formatMoney(stats.mrr)} ₸</div>
          <div className="text-sm text-gray-500">MRR (доход)</div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Воронка конверсии</h3>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {funnelSteps.map((step, idx) => {
            const pct = stats.conversionFunnel.registered > 0
              ? Math.round((step.value / stats.conversionFunnel.registered) * 100)
              : 0;
            return (
              <div key={step.label} className="flex items-center gap-3 flex-1">
                <div className="flex-1 bg-gray-700/50 rounded-xl p-4 text-center border border-gray-700">
                  <div className="text-2xl font-bold text-white">{step.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{step.label}</div>
                  {idx > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                        <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{pct}%</div>
                    </div>
                  )}
                </div>
                {idx < funnelSteps.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-gray-300 hidden sm:block flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Registrations chart */}
        <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Регистрации за 30 дней</h3>
          <div className="h-40 flex items-end gap-[2px]">
            {stats.registrations.map((r, idx) => {
              const height = (r.count / maxReg) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer min-w-[4px]"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${r.date}: ${r.count}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{stats.registrations[0]?.date.slice(5)}</span>
            <span>{stats.registrations[stats.registrations.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Plan distribution */}
        <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Распределение по тарифам</h3>
          <div className="space-y-4">
            {planEntries.length > 0 ? planEntries.map(plan => (
              <div key={plan.plan} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-gray-300">{plan.label}</div>
                <div className="flex-1 h-8 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${plan.color} rounded-full flex items-center justify-end pr-3`}
                    style={{ width: `${Math.max(plan.percentage, 5)}%` }}
                  >
                    <span className="text-white text-xs font-medium">{plan.count}</span>
                  </div>
                </div>
                <div className="w-12 text-right text-sm text-gray-500">{plan.percentage}%</div>
              </div>
            )) : (
              <p className="text-gray-400 text-sm">Нет подписок</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity feed + Recent users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <div className="lg:col-span-2 bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Лента активности</h3>
          </div>
          <div className="space-y-1">
            {stats.recentActivity.length > 0 ? stats.recentActivity.map((event, idx) => {
              const config = activityConfig[event.type] || activityConfig.registration;
              return (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">
                      <span className="font-medium">{event.name}</span>
                      {' '}
                      <span className="text-gray-500">{config.label}</span>
                      {event.detail && (
                        <span className="text-gray-400"> — {event.detail}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{event.email}</div>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {timeAgo(event.date)}
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-400 text-sm text-center py-8">Нет активности</p>
            )}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-gray-800/80 rounded-xl p-5 shadow-sm border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Новые пользователи</h3>
            <Link href="/admin/users" className="text-sm text-blue-400 hover:text-blue-500 flex items-center gap-1">
              Все <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.latestUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
                <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-white truncate">{u.name}</div>
                  <div className="text-xs text-gray-400 truncate">{u.email}</div>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {timeAgo(u.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
