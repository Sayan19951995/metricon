'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { getPlanLimits } from '@/lib/plan-limits';
import UpgradePrompt from '@/components/UpgradePrompt';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import BrandLoader from '@/components/ui/BrandLoader';
import Link from 'next/link';
import {
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  ChevronRight,
  Target,
  Megaphone,
  Gift,
  Star,
  ExternalLink,
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

interface ChannelCosts {
  productAds: number;
  externalAds: number;
  sellerBonuses: number;
  reviewBonuses: number;
}

export default function AdvertisingPage() {
  const { user, store, subscription, loading: userLoading } = useUser();
  const [summary, setSummary] = useState<MarketingSummary | null>(null);
  const [channels, setChannels] = useState<ChannelCosts | null>(null);
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
      const res = await fetchWithAuth(`/api/kaspi/marketing?startDate=${fmt(start)}&endDate=${fmt(end)}`);
      const json = await res.json();
      if (json.success && json.data?.summary) {
        setSummary(json.data.summary);
        if (json.data.channels) setChannels(json.data.channels);
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
  if (!getPlanLimits(subscription?.plan).canAdvertising) {
    return <UpgradePrompt requiredPlan="business" featureName="Маркетинг" />;
  }

  return (
    <div className="min-h-screen bg-slate-200 dark:bg-gray-900">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Маркетинг</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление маркетинговыми каналами</p>
          </div>

          {!connected ? (
            /* Not connected — show connect prompt */
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Kaspi Marketing</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Не подключено</p>
                </div>
              </div>
              <Link
                href="/app/advertising/kaspi-marketing"
                className="block bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Подключите аккаунт marketing.kaspi.kz для отслеживания маркетинговых каналов →
                </p>
              </Link>
            </div>
          ) : (
            <>
              {/* Total expenses */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Общие расходы на маркетинг · 30 дней</p>
                    {loading ? (
                      <div className="h-7 bg-gray-200 dark:bg-gray-600 rounded w-32 animate-pulse" />
                    ) : summary ? (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtMoney(summary.totalCost)}</p>
                    ) : null}
                  </div>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                </div>
              </div>

              {/* Channel cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Реклама товаров */}
                <Link
                  href="/app/advertising/kaspi-marketing"
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Реклама товаров</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  {channels && (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {channels.productAds > 0 ? fmtMoney(channels.productAds) : '0 ₸'}
                    </p>
                  )}
                  {summary && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {summary.activeCampaigns} активных кампаний
                    </p>
                  )}
                </Link>

                {/* Внешняя реклама */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Внешняя реклама</h3>
                  </div>
                  {channels && (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {channels.externalAds > 0 ? fmtMoney(channels.externalAds) : '0 ₸'}
                    </p>
                  )}
                </div>

                {/* Бонусы от продавца */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Gift className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Бонусы от продавца</h3>
                  </div>
                  {channels && (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {channels.sellerBonuses > 0 ? fmtMoney(channels.sellerBonuses) : '0 ₸'}
                    </p>
                  )}
                </div>

                {/* Бонусы за отзыв */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Star className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Бонусы за отзыв</h3>
                  </div>
                  {channels && (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {channels.reviewBonuses > 0 ? fmtMoney(channels.reviewBonuses) : '0 ₸'}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
