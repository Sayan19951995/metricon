'use client';

import { useState, useEffect } from 'react';
import {
  Users, CreditCard, TrendingUp, UserPlus, Store, Loader2,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalStores: number;
  kaspiConnected: number;
  newUsersLast30Days: number;
  planDistribution: Record<string, number>;
  registrations: { date: string; count: number }[];
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
      const res = await fetch(`/api/admin/stats?userId=${user!.id}`);
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
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Админ-панель</h1>
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Админ-панель</h1>
        <p className="text-gray-500 mt-1">Статистика и управление платформой</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
          <div className="text-sm text-gray-500">Всего пользователей</div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</div>
          <div className="text-sm text-gray-500">Активных подписок</div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <Store className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.kaspiConnected} <span className="text-sm text-gray-400 font-normal">/ {stats.totalStores}</span>
          </div>
          <div className="text-sm text-gray-500">Kaspi подключён</div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">+{stats.newUsersLast30Days}</div>
          <div className="text-sm text-gray-500">Новых за 30 дней</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Registrations chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Регистрации за 30 дней</h3>
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
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Распределение по тарифам</h3>
          <div className="space-y-4">
            {planEntries.length > 0 ? planEntries.map(plan => (
              <div key={plan.plan} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-gray-700">{plan.label}</div>
                <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
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
    </div>
  );
}
