'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import BrandLoader from '@/components/ui/BrandLoader';
import DateRangeCalendar from '@/components/DateRangeCalendar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Plug,
  PlugZap,
  Eye,
  EyeOff,
  MousePointer,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Unlink,
  BarChart3,
  Target,
  ChevronRight,
  Package,
  ArrowLeft,
  Loader2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

interface Campaign {
  id: number;
  name: string;
  cost: number;
  views: number;
  clicks: number;
  transactions: number;
  gmv: number;
  state: string;
}

interface CampaignProduct {
  id: number;
  sku: string;
  productName: string;
  productUrl?: string;
  imageUrl?: string;
  bid: number;
  state: string;
  views: number;
  clicks: number;
  favorites: number;
  carts: number;
  ctr: number;
  gmv: number;
  transactions: number;
  cost: number;
  crr: number;
}

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

export default function KaspiMarketingPage() {
  const router = useRouter();
  const { user, store, loading: userLoading } = useUser();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [merchantName, setMerchantName] = useState('');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<MarketingSummary | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignProducts, setCampaignProducts] = useState<CampaignProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Локальная дата YYYY-MM-DD (без сдвига UTC)
  const toLocalDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Фильтр дат
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - 29);
  const [filterStart, setFilterStart] = useState<Date>(defaultStart);
  const [filterEnd, setFilterEnd] = useState<Date>(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('30d');
  const calendarRef = useRef<HTMLDivElement>(null);

  const applyPreset = (preset: string) => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    if (preset === '7d') start.setDate(end.getDate() - 6);
    else if (preset === '14d') start.setDate(end.getDate() - 13);
    else if (preset === '30d') start.setDate(end.getDate() - 29);
    else if (preset === '90d') start.setDate(end.getDate() - 89);
    setFilterStart(start);
    setFilterEnd(end);
    setActivePreset(preset);
    setShowCalendar(false);
  };

  const handleCalendarApply = (start: Date | null, end: Date | null) => {
    if (start && end) {
      setFilterStart(start);
      setFilterEnd(end);
      setActivePreset('custom');
    }
    setShowCalendar(false);
  };

  const formatDateRange = () => {
    return `${format(filterStart, 'd MMM', { locale: ru })} — ${format(filterEnd, 'd MMM yyyy', { locale: ru })}`;
  };

  // Закрытие календаря по клику вне
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCalendar]);

  // Проверяем подключение при загрузке
  useEffect(() => {
    if (store && (store as unknown as Record<string, unknown>).marketing_session) {
      const session = (store as unknown as Record<string, unknown>).marketing_session as { merchant_name?: string };
      setConnected(true);
      setMerchantName(session.merchant_name || '');
    }
  }, [store]);

  // Загрузка данных кампаний
  const fetchCampaigns = useCallback(async () => {
    if (!user?.id || !connected) return;
    setLoadingData(true);
    setError('');
    try {
      const startDate = toLocalDate(filterStart);
      const endDate = toLocalDate(filterEnd);
      const res = await fetch(`/api/kaspi/marketing?userId=${user.id}&startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.data.campaigns || []);
        setSummary(json.data.summary || null);
      } else {
        setError(json.message || 'Ошибка загрузки данных маркетинга');
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      setError('Не удалось загрузить данные маркетинга');
    } finally {
      setLoadingData(false);
    }
  }, [user?.id, connected, filterStart, filterEnd]);

  useEffect(() => {
    if (connected) {
      fetchCampaigns();
    }
  }, [connected, fetchCampaigns]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConnecting(true);

    try {
      const res = await fetch('/api/kaspi/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          username,
          password,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setConnected(true);
        setMerchantName(json.data.merchantName || '');
        setUsername('');
        setPassword('');
      } else {
        setError(json.message || 'Ошибка подключения');
      }
    } catch (err) {
      setError('Не удалось подключиться к Kaspi Marketing');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/kaspi/marketing?userId=${user.id}`, { method: 'DELETE' });
      setConnected(false);
      setCampaigns([]);
      setSummary(null);
      setMerchantName('');
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetchCampaigns();
    setSyncing(false);
  };

  const openCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setCampaignProducts([]);
    setLoadingProducts(true);
    try {
      const sd = toLocalDate(filterStart);
      const ed = toLocalDate(filterEnd);
      const res = await fetch(`/api/kaspi/marketing/campaign?userId=${user?.id}&campaignId=${campaign.id}&startDate=${sd}&endDate=${ed}`);
      const json = await res.json();
      if (json.success) {
        setCampaignProducts(json.data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch campaign products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const closeCampaign = () => {
    setSelectedCampaign(null);
    setCampaignProducts([]);
  };

  const fmt = (n: number) => n.toLocaleString('ru-RU');
  const fmtMoney = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;

  if (userLoading) return <BrandLoader />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link href="/app/advertising" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Kaspi Marketing</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Рекламные кампании и расходы</p>
            </div>
          </div>

          {/* Детальный вид кампании */}
          {selectedCampaign ? (
            <div className="space-y-4">
              {/* Назад к списку */}
              <button
                onClick={closeCampaign}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад к кампаниям
              </button>

              {/* Заголовок кампании */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    selectedCampaign.state === 'Enabled' ? 'bg-emerald-500' : selectedCampaign.state === 'Paused' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{selectedCampaign.name}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedCampaign.state === 'Enabled' ? 'Активна' : selectedCampaign.state === 'Paused' ? 'На паузе' : 'В архиве'}
                    </p>
                  </div>
                </div>

                {/* Метрики кампании */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Расходы</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtMoney(selectedCampaign.cost)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Показы</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(selectedCampaign.views)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Клики</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(selectedCampaign.clicks)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Выручка</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(selectedCampaign.gmv)}</p>
                  </div>
                </div>
              </div>

              {/* Список товаров кампании */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">Товары в кампании</h3>
                  {!loadingProducts && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">({campaignProducts.length})</span>
                  )}
                </div>

                {loadingProducts ? (
                  <div className="p-8 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка товаров...
                  </div>
                ) : campaignProducts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Нет товаров в кампании</div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {[...campaignProducts]
                      .sort((a, b) => b.cost - a.cost || b.views - a.views)
                      .map((p) => (
                      <div key={p.id} className="p-3 sm:p-4">
                        <div className="flex items-start gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.productName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {p.sku} · Ставка: {p.bid} ₸</p>
                          </div>
                          <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                            p.state === 'Enabled'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : p.state === 'Paused'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            {p.state === 'Enabled' ? 'Вкл' : p.state === 'Paused' ? 'Пауза' : 'Архив'}
                          </div>
                        </div>
                        {/* Метрики товара */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2 ml-13">
                          <div>
                            <p className="text-[10px] text-gray-400">Расход</p>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{fmtMoney(p.cost)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Показы</p>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{fmt(p.views)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Клики</p>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{fmt(p.clicks)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Заказы</p>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{p.transactions}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Выручка</p>
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{fmtMoney(p.gmv)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">CTR</p>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{p.ctr.toFixed(2)}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !connected ? (
            /* --- Форма подключения --- */
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Plug className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Подключить аккаунт</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Введите данные от marketing.kaspi.kz</p>
                </div>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Логин (телефон)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="87076207065"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Пароль</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 pr-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Данные используются только для загрузки статистики рекламных кампаний.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-sm transition-colors cursor-pointer"
                >
                  {connecting ? 'Подключение...' : 'Подключить'}
                </button>
              </form>
            </div>
          ) : (
            /* --- Подключено: статистика --- */
            <div className="space-y-4">
              {/* Статус подключения */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <PlugZap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{merchantName || 'Подключено'}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Kaspi Marketing активен</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                    title="Синхронизировать"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${syncing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                    title="Отключить"
                  >
                    <Unlink className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Фильтр дат */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Пресеты */}
                  {[
                    { key: '7d', label: '7 дней' },
                    { key: '14d', label: '14 дней' },
                    { key: '30d', label: '30 дней' },
                    { key: '90d', label: '90 дней' },
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => applyPreset(p.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activePreset === p.key
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}

                  {/* Календарь */}
                  <div className="relative ml-auto" ref={calendarRef}>
                    <button
                      onClick={() => setShowCalendar(!showCalendar)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activePreset === 'custom'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateRange()}
                    </button>
                    <AnimatePresence>
                      {showCalendar && (
                        <DateRangeCalendar
                          startDate={filterStart}
                          endDate={filterEnd}
                          onApply={handleCalendarApply}
                          onCancel={() => setShowCalendar(false)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Сводка */}
              {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Расходы</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtMoney(summary.totalCost)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Показы</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(summary.totalViews)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <MousePointer className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Клики</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(summary.totalClicks)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">ROAS</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{summary.roas.toFixed(1)}x</p>
                  </div>
                </div>
              )}

              {/* Дополнительные метрики */}
              {summary && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Заказы от рекламы</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(summary.totalTransactions)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Выручка от рекламы</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtMoney(summary.totalGmv)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CTR</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.avgCtr.toFixed(2)}%</p>
                  </div>
                </div>
              )}

              {/* Список кампаний */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">Кампании</h3>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {summary ? `${summary.activeCampaigns} активных из ${summary.totalCampaigns}` : ''}
                  </span>
                </div>

                {loadingData ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Загрузка...</div>
                ) : campaigns.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Нет кампаний за выбранный период</div>
                ) : (() => {
                  const stateOrder: Record<string, number> = { Enabled: 0, Paused: 1, Archived: 2 };
                  const sorted = [...campaigns].sort((a, b) => {
                    const sa = stateOrder[a.state] ?? 3;
                    const sb = stateOrder[b.state] ?? 3;
                    if (sa !== sb) return sa - sb;
                    return b.cost - a.cost || b.views - a.views;
                  });
                  const active = sorted.filter(c => c.cost > 0 || c.views > 0);
                  const inactive = sorted.filter(c => c.cost === 0 && c.views === 0);

                  const renderCampaign = (c: Campaign) => (
                    <button
                      key={c.id}
                      onClick={() => openCampaign(c)}
                      className="w-full p-3 sm:p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer text-left"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        c.state === 'Enabled' ? 'bg-emerald-500' : c.state === 'Paused' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {fmt(c.views)} показов · {fmt(c.clicks)} кликов · {c.transactions} заказов
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{fmtMoney(c.cost)}</p>
                        {c.gmv > 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">→ {fmtMoney(c.gmv)}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                  );

                  return (
                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                      {active.map(renderCampaign)}
                      {inactive.length > 0 && (
                        <>
                          <button
                            onClick={() => setShowInactive(!showInactive)}
                            className="w-full p-3 text-center text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                          >
                            {showInactive ? 'Скрыть' : `Показать ещё ${inactive.length} без активности`}
                          </button>
                          {showInactive && inactive.map(renderCampaign)}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
