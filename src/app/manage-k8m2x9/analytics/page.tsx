'use client';

import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Store, Users, CreditCard, Loader2, Crown, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import Link from 'next/link';

interface TopUser { userId: string; name: string; email: string; storeName: string; revenue: number; }
interface ActiveStore { storeId: string; storeName: string; orders: number; }
interface PlanStats { [plan: string]: { active: number; trial: number; expired: number }; }
interface UserNoSub { id: string; name: string; email: string; createdAt: string; }

interface AnalyticsData {
  topUsersByRevenue: TopUser[];
  mostActiveStores: ActiveStore[];
  planStats: PlanStats;
  usersWithoutSubscription: UserNoSub[];
  totalWithoutSub: number;
}

function formatRevenue(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₸`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₸`;
  return `${n} ₸`;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 30) return `${days}д назад`;
  const months = Math.floor(days / 30);
  return `${months}мес назад`;
}

const PLAN_LABELS: Record<string, string> = { start: 'Start', business: 'Business', pro: 'Pro' };
const PLAN_COLORS: Record<string, string> = {
  start: 'bg-blue-500',
  business: 'bg-emerald-500',
  pro: 'bg-purple-500',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Ошибка загрузки
      </div>
    );
  }

  const planOrder = ['start', 'business', 'pro'];
  const maxPlanTotal = Math.max(...planOrder.map(p => {
    const s = data.planStats[p] || { active: 0, trial: 0, expired: 0 };
    return s.active + s.trial + s.expired;
  }), 1);

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart2 className="w-7 h-7 text-blue-400" />
          Аналитика
        </h1>
        <p className="text-gray-400 mt-1">Статистика за последние 30 дней</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Топ по выручке */}
        <div className="bg-gray-800/80 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Топ по выручке</h2>
            <span className="text-xs text-gray-500 ml-1">за 30 дней</span>
          </div>
          {data.topUsersByRevenue.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Нет данных</div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {data.topUsersByRevenue.map((u, i) => (
                <div key={u.userId} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-700/30 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-700 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{u.name}</div>
                    <div className="text-xs text-gray-500 truncate">{u.storeName}</div>
                  </div>
                  <div className="text-sm font-semibold text-amber-400 flex-shrink-0">
                    {formatRevenue(u.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Активные магазины */}
        <div className="bg-gray-800/80 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-2">
            <Store className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Активные магазины</h2>
            <span className="text-xs text-gray-500 ml-1">по заказам за 30 дней</span>
          </div>
          {data.mostActiveStores.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Нет данных</div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {data.mostActiveStores.map((s, i) => (
                <div key={s.storeId} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-700/30 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-green-500/20 text-green-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-gray-700 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{s.storeName}</div>
                  </div>
                  <div className="text-sm font-semibold text-green-400 flex-shrink-0">
                    {s.orders.toLocaleString('ru')} заказов
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Тарифы */}
        <div className="bg-gray-800/80 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Статистика по тарифам</h2>
          </div>
          <div className="p-6 space-y-5">
            {planOrder.map(plan => {
              const s = data.planStats[plan] || { active: 0, trial: 0, expired: 0 };
              const total = s.active + s.trial + s.expired;
              const pct = Math.round((total / maxPlanTotal) * 100);
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white">{PLAN_LABELS[plan]}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {s.active > 0 && <span className="text-emerald-400">{s.active} active</span>}
                      {s.trial > 0 && <span className="text-blue-400">{s.trial} trial</span>}
                      {s.expired > 0 && <span className="text-gray-500">{s.expired} expired</span>}
                      <span className="text-gray-300 font-medium">{total} всего</span>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${PLAN_COLORS[plan]} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Без подписки */}
        <div className="bg-gray-800/80 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Без подписки</h2>
            <span className="ml-auto bg-red-500/20 text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              {data.totalWithoutSub}
            </span>
          </div>
          {data.usersWithoutSubscription.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Все пользователи имеют подписку</div>
          ) : (
            <div className="divide-y divide-gray-700/50max-h-80 overflow-y-auto">
              {data.usersWithoutSubscription.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-700/30 transition-colors">
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{u.name}</div>
                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">{timeAgo(u.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
