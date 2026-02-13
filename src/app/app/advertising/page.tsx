'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import BrandLoader from '@/components/ui/BrandLoader';
import Link from 'next/link';
import {
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  ChevronRight,
  BarChart3,
  Target,
  Megaphone,
} from 'lucide-react';

interface MarketingSummary {
  totalCost: number;
  totalViews: number;
  totalClicks: number;
  totalTransactions: number;
  totalGmv: number;
  avgCtr: number;
  roas: number;
  crr: number;
  activeCampaigns: number;
  totalCampaigns: number;
}

export default function AdvertisingPage() {
  const { user, store, loading: userLoading } = useUser();
  const [summary, setSummary] = useState<MarketingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (store && (store as unknown as Record<string, unknown>).marketing_session) {
      setConnected(true);
    }
  }, [store]);

  const fetchSummary = useCallback(async () => {
    if (!user?.id || !connected) return;
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - 29);
      const fmt = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const res = await fetch(`/api/kaspi/marketing?userId=${user.id}&startDate=${fmt(start)}&endDate=${fmt(end)}`);
      const json = await res.json();
      if (json.success && json.data?.summary) {
        setSummary(json.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch marketing summary:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, connected]);

  useEffect(() => {
    if (connected) fetchSummary();
  }, [connected, fetchSummary]);

  const fmtMoney = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;
  const fmt = (n: number) => n.toLocaleString('ru-RU');

  if (userLoading) return <BrandLoader />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Реклама</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление рекламными каналами</p>
          </div>

          {/* Kaspi Marketing Card */}
          <Link
            href="/app/advertising/kaspi-marketing"
            className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all group mb-4"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Kaspi Marketing</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {connected ? 'Подключено' : 'Не подключено'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connected && (
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {!connected ? (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Подключите аккаунт marketing.kaspi.kz для отслеживания рекламных кампаний
                  </p>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 animate-pulse">
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 mb-2" />
                      <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-20" />
                    </div>
                  ))}
                </div>
              ) : summary ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Расходы</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtMoney(summary.totalCost)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Показы</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(summary.totalViews)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MousePointer className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Клики</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(summary.totalClicks)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">ROAS</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{summary.roas.toFixed(1)}x</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{summary.activeCampaigns} активных кампаний</span>
                    <span>·</span>
                    <span>{summary.totalTransactions} заказов от рекламы</span>
                    <span>·</span>
                    <span>Выручка {fmtMoney(summary.totalGmv)}</span>
                  </div>
                </>
              ) : null}
            </div>
          </Link>

          {/* Future channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: 'Instagram / Facebook', icon: Megaphone, color: 'pink' },
              { name: 'Google Ads', icon: BarChart3, color: 'blue' },
            ].map((channel) => (
              <div
                key={channel.name}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center`}>
                    <channel.icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{channel.name}</h3>
                    <p className="text-xs text-gray-400">Скоро</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
