'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield,
  Lock,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Calendar,
  BarChart3,
  Search,
  Package,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Percent,
  ArrowLeft,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

type Period = '7d' | '30d' | '90d' | '365d' | 'custom';

interface StoreDetails {
  id: string;
  name: string;
  merchantId: string | null;
  ownerEmail: string;
  ownerName: string;
  commissionRate: number;
  taxRate: number;
  productsCount: number;
  lastSyncedAt: string | null;
}

interface DailyData {
  date: string;
  salesCount: number;
  totalAmount: number;
  costPrice: number;
  commission: number;
  tax: number;
  delivery: number;
  profit: number;
}

interface ProductStat {
  id: number;
  code: string;
  name: string;
  salesCount: number;
  totalAmount: number;
  avgPrice: number;
  costPrice: number;
  profit: number;
}

interface Totals {
  totalOrders: number;
  totalRevenue: number;
  totalCost: number;
  totalCommission: number;
  totalTax: number;
  totalDelivery: number;
  totalProfit: number;
  avgOrder: number;
  margin: number;
}

export default function StoreAnalyticsPage() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;

  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Product table
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<{ field: 'salesCount' | 'totalAmount' | 'avgPrice' | 'profit' | 'name'; dir: 'asc' | 'desc' }>({ field: 'totalAmount', dir: 'desc' });
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 10;

  // Date range
  const { dateFrom, dateTo } = useMemo(() => {
    const end = new Date();
    let start = new Date();

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '365d':
        start.setDate(end.getDate() - 365);
        break;
      case 'custom':
        if (customStart && customEnd) {
          return { dateFrom: customStart, dateTo: customEnd };
        }
        start.setDate(end.getDate() - 30);
        break;
    }

    return {
      dateFrom: start.toISOString().split('T')[0],
      dateTo: end.toISOString().split('T')[0],
    };
  }, [period, customStart, customEnd]);

  const loadData = useCallback(async () => {
    if (!user?.id || !storeId) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ userId: user.id, storeId, dateFrom, dateTo });
      const res = await fetch(`/api/admin/store-analytics?${p}`);
      const json = await res.json();
      if (json.success) {
        setStoreDetails(json.store);
        setTotals(json.totals);
        setDailyData(json.dailyData || []);
        setProductStats(json.productStats || []);
        setProductPage(1);
      }
    } catch (e) {
      console.error('Failed to load store data:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, storeId, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B ₸`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₸`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K ₸`;
    return `${Math.round(amount)} ₸`;
  };

  // Product filtering and sorting
  const filteredProducts = useMemo(() => {
    let result = [...productStats];
    if (productSearch) {
      const s = productSearch.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.code.toLowerCase().includes(s)
      );
    }
    result.sort((a, b) => {
      const aVal = a[productSort.field];
      const bVal = b[productSort.field];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return productSort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return productSort.dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [productStats, productSearch, productSort]);

  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (productPage - 1) * productsPerPage,
    productPage * productsPerPage
  );

  const handleProductSort = (field: 'salesCount' | 'totalAmount' | 'avgPrice' | 'profit' | 'name') => {
    setProductSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (productSort.field !== field) return null;
    return productSort.dir === 'desc'
      ? <ChevronDown className="w-4 h-4" />
      : <ChevronUp className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/x7k9m2p4q8r1')}
            className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {storeDetails?.name || 'Загрузка...'}
            </h1>
            {storeDetails && (
              <p className="text-gray-500 text-sm">
                {storeDetails.ownerName || storeDetails.ownerEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Store Info Bar */}
      {storeDetails && (
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700/50 flex flex-wrap gap-4 sm:gap-6 text-sm">
          <div>
            <span className="text-gray-500">Email:</span>{' '}
            <span className="text-white">{storeDetails.ownerEmail}</span>
          </div>
          {storeDetails.merchantId && (
            <div>
              <span className="text-gray-500">Merchant ID:</span>{' '}
              <span className="text-white font-mono">{storeDetails.merchantId}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Товаров:</span>{' '}
            <span className="text-white">{storeDetails.productsCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Комиссия:</span>{' '}
            <span className="text-white">{storeDetails.commissionRate}%</span>
          </div>
          <div>
            <span className="text-gray-500">Налог:</span>{' '}
            <span className="text-white">{storeDetails.taxRate}%</span>
          </div>
          {storeDetails.lastSyncedAt && (
            <div>
              <span className="text-gray-500">Синхр:</span>{' '}
              <span className="text-white">{new Date(storeDetails.lastSyncedAt).toLocaleDateString('ru')}</span>
            </div>
          )}
        </div>
      )}

      {/* Period Selector */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400 text-sm">Период:</span>

          {[
            { value: '7d', label: '7 дней' },
            { value: '30d', label: '30 дней' },
            { value: '90d', label: '90 дней' },
            { value: '365d', label: '1 год' },
            { value: 'custom', label: 'Свой' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as Period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <style>{`
                .dark-date-input::-webkit-calendar-picker-indicator {
                  filter: invert(1);
                  cursor: pointer;
                }
              `}</style>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="dark-date-input bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-gray-500">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="dark-date-input bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      )}

      {/* Data */}
      {!loading && totals && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{totals.totalOrders.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Заказов</div>
            </div>

            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">{formatAmount(totals.totalRevenue)}</div>
              <div className="text-sm text-gray-400">Выручка</div>
            </div>

            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatAmount(totals.totalProfit)}
              </div>
              <div className="text-sm text-gray-400">Прибыль</div>
            </div>

            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
                <Percent className="w-5 h-5 text-amber-400" />
              </div>
              <div className={`text-2xl font-bold ${totals.margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totals.margin.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Маржа</div>
            </div>
          </div>

          {/* Expense breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">Себестоимость</div>
              <div className="text-lg font-semibold text-white">{formatAmount(totals.totalCost)}</div>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">Комиссия</div>
              <div className="text-lg font-semibold text-white">{formatAmount(totals.totalCommission)}</div>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">Налоги</div>
              <div className="text-lg font-semibold text-white">{formatAmount(totals.totalTax)}</div>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">Доставка</div>
              <div className="text-lg font-semibold text-white">{formatAmount(totals.totalDelivery)}</div>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">Средний чек</div>
              <div className="text-lg font-semibold text-white">{formatAmount(totals.avgOrder)}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sales Chart */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Динамика продаж</h3>
                <BarChart3 className="w-5 h-5 text-gray-500" />
              </div>
              {dailyData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Нет данных за период</div>
              ) : (
                <>
                  <div className="h-48 flex items-end gap-0.5">
                    {dailyData.slice(-30).map((day, idx) => {
                      const maxVal = Math.max(...dailyData.slice(-30).map(d => d.salesCount));
                      const height = maxVal > 0 ? (day.salesCount / maxVal) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-blue-500 hover:bg-blue-400 rounded-t transition-colors cursor-pointer"
                          style={{ height: `${Math.max(height, 1)}%` }}
                          title={`${day.date}: ${day.salesCount} продаж`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{dailyData[Math.max(0, dailyData.length - 30)]?.date}</span>
                    <span>{dailyData[dailyData.length - 1]?.date}</span>
                  </div>
                </>
              )}
            </div>

            {/* Revenue Chart */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Динамика выручки</h3>
                <BarChart3 className="w-5 h-5 text-gray-500" />
              </div>
              {dailyData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Нет данных за период</div>
              ) : (
                <>
                  <div className="h-48 flex items-end gap-0.5">
                    {dailyData.slice(-30).map((day, idx) => {
                      const maxVal = Math.max(...dailyData.slice(-30).map(d => d.totalAmount));
                      const height = maxVal > 0 ? (day.totalAmount / maxVal) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 rounded-t transition-colors cursor-pointer"
                          style={{ height: `${Math.max(height, 1)}%` }}
                          title={`${day.date}: ${formatAmount(day.totalAmount)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{dailyData[Math.max(0, dailyData.length - 30)]?.date}</span>
                    <span>{dailyData[dailyData.length - 1]?.date}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Profit Chart */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Динамика прибыли</h3>
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
            {dailyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Нет данных за период</div>
            ) : (
              <>
                <div className="h-48 flex items-end gap-0.5">
                  {dailyData.slice(-30).map((day, idx) => {
                    const profits = dailyData.slice(-30).map(d => d.profit);
                    const maxVal = Math.max(...profits.map(Math.abs));
                    const height = maxVal > 0 ? (Math.abs(day.profit) / maxVal) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-t transition-colors cursor-pointer ${
                          day.profit >= 0
                            ? 'bg-emerald-500 hover:bg-emerald-400'
                            : 'bg-red-500 hover:bg-red-400'
                        }`}
                        style={{ height: `${Math.max(height, 1)}%` }}
                        title={`${day.date}: ${formatAmount(day.profit)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{dailyData[Math.max(0, dailyData.length - 30)]?.date}</span>
                  <span>{dailyData[dailyData.length - 1]?.date}</span>
                </div>
              </>
            )}
          </div>

          {/* Product Details */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Товары</h3>
                <span className="text-gray-500 text-sm">({filteredProducts.length})</span>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Поиск по названию или коду..."
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
                  style={{ paddingLeft: '44px' }}
                  className="bg-gray-700 border border-gray-600 rounded-lg pr-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-72"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Код</th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleProductSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Товар
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleProductSort('salesCount')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Продаж
                        <SortIcon field="salesCount" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleProductSort('totalAmount')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Выручка
                        <SortIcon field="totalAmount" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors hidden sm:table-cell"
                      onClick={() => handleProductSort('avgPrice')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Ср. цена
                        <SortIcon field="avgPrice" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors hidden md:table-cell"
                      onClick={() => handleProductSort('profit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Прибыль
                        <SortIcon field="profit" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                        {productStats.length === 0 ? 'Нет данных за период' : 'Ничего не найдено'}
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => (
                      <tr key={product.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 px-4 text-sm text-gray-400 font-mono text-xs">{product.code}</td>
                        <td className="py-3 px-4 text-sm text-white max-w-[200px] truncate">{product.name}</td>
                        <td className="py-3 px-4 text-sm text-white text-right font-medium">{product.salesCount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-emerald-400 text-right font-medium">{formatAmount(product.totalAmount)}</td>
                        <td className="py-3 px-4 text-sm text-gray-300 text-right hidden sm:table-cell">{formatAmount(product.avgPrice)}</td>
                        <td className={`py-3 px-4 text-sm text-right font-medium hidden md:table-cell ${product.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatAmount(product.profit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalProductPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-500">
                  {((productPage - 1) * productsPerPage) + 1}-{Math.min(productPage * productsPerPage, filteredProducts.length)} из {filteredProducts.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProductPage(p => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-sm text-gray-400 px-2">
                    {productPage} / {totalProductPages}
                  </span>
                  <button
                    onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))}
                    disabled={productPage === totalProductPages}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-gray-600 text-xs">
            <Lock className="w-3 h-3" />
            <span>Данные защищены • Доступ ограничен</span>
          </div>
        </>
      )}

      {/* No data */}
      {!loading && !totals && (
        <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
          Нет данных для этого магазина
        </div>
      )}
    </div>
  );
}
