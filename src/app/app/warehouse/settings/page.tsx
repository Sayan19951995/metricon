'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  MapPin,
  Package,
  Loader2,
  Store,
  AlertCircle,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase/client';
import { getStale, setCache } from '@/lib/cache';

interface POSInfo {
  storeId: string;
  storeName: string;
  cityName: string;
  productCount: number;
  totalStock: number;
  totalValue: number;
}

const CACHE_KEY_PREFIX = 'warehouse_pos_';

export default function WarehouseSettingsPage() {
  const { user, store, loading: userLoading } = useUser();

  const cacheKey = store?.id ? `${CACHE_KEY_PREFIX}${store.id}` : '';
  const stale = cacheKey ? getStale<POSInfo[]>(cacheKey) : null;

  const [posList, setPOSList] = useState<POSInfo[]>(stale?.data || []);
  const [loading, setLoading] = useState(!stale);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPOSData = useCallback(async (showRefresh = false) => {
    if (!user?.id || !store?.id) return;
    const hasCached = posList.length > 0;
    if (!hasCached) setLoading(true);
    if (showRefresh) setRefreshing(true);
    setError(null);

    try {
      // Parallel: DB products (known SKUs + prices) + Cabinet API (live stock per POS)
      const [dbResult, cabinetRes] = await Promise.all([
        supabase
          .from('products')
          .select('sku, price')
          .eq('store_id', store.id)
          .not('sku', 'is', null),
        fetch(`/api/kaspi/cabinet/products?userId=${user.id}`).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (!cabinetRes.success) {
        if (cabinetRes.needLogin) {
          setError('Кабинет Kaspi не подключен. Подключите в настройках магазина.');
        } else {
          setError(cabinetRes.error || 'Ошибка загрузки данных');
        }
        setPOSList([]);
        return;
      }

      // Build set of known SKUs + price map from DB
      const dbSkus = new Set<string>();
      const dbPriceMap = new Map<string, number>();
      for (const p of dbResult.data || []) {
        if (p.sku) {
          dbSkus.add(p.sku);
          if (p.price) dbPriceMap.set(p.sku, p.price);
        }
      }

      // Extract unique POS from product availabilities (only products in DB)
      const posMap = new Map<string, POSInfo>();

      for (const product of cabinetRes.products || []) {
        if (!product.sku || !dbSkus.has(product.sku)) continue;
        const price = dbPriceMap.get(product.sku) || product.price || 0;
        for (const avail of product.availabilities || []) {
          const id = avail.storeId || avail.storeName || 'unknown';
          const stockCount = avail.stockCount || 0;
          const existing = posMap.get(id);

          if (existing) {
            existing.productCount++;
            existing.totalStock += stockCount;
            existing.totalValue += price * stockCount;
          } else {
            posMap.set(id, {
              storeId: id,
              storeName: avail.storeName || avail.storeId || '—',
              cityName: avail.cityName || '',
              productCount: 1,
              totalStock: stockCount,
              totalValue: price * stockCount,
            });
          }
        }
      }

      const result = Array.from(posMap.values()).sort((a, b) => b.totalStock - a.totalStock);
      setPOSList(result);
      if (cacheKey) setCache(cacheKey, result);
    } catch (err) {
      console.error('Failed to load POS data:', err);
      setError('Ошибка сети');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, store?.id, cacheKey]);

  useEffect(() => {
    if (user?.id && store?.id) loadPOSData();
  }, [user?.id, store?.id]);

  const totalProducts = posList.reduce((s, p) => s + p.productCount, 0);
  const totalStock = posList.reduce((s, p) => s + p.totalStock, 0);
  const totalValue = posList.reduce((s, p) => s + (p.totalValue || 0), 0);

  // Loading skeleton
  if (userLoading || (loading && posList.length === 0)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mb-6">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${30 + Math.random() * 30}%` }} />
                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <Link
          href="/app/warehouse"
          className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Назад к складу</span>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-gray-900 dark:text-white">Точки продаж</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Ваши точки выдачи Kaspi и остатки по ним</p>
          </div>
          <button
            onClick={() => loadPOSData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
            {error.includes('не подключен') && (
              <Link
                href="/app/settings"
                className="text-sm text-red-600 dark:text-red-400 underline mt-1 inline-block"
              >
                Перейти в настройки
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {posList.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Точек</p>
                <p className="text-sm lg:text-base font-bold text-gray-900 dark:text-white">{posList.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Позиций</p>
                <p className="text-sm lg:text-base font-bold text-emerald-600">{totalProducts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Всего шт</p>
                <p className="text-sm lg:text-base font-bold text-amber-600">{totalStock.toLocaleString('ru-RU')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Стоимость</p>
                <p className="text-sm lg:text-base font-bold text-purple-600">{totalValue >= 1_000_000 ? `${(totalValue / 1_000_000).toFixed(1)}M` : totalValue.toLocaleString('ru-RU')} ₸</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS List */}
      {posList.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Точки выдачи Kaspi</h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {posList.map((pos) => (
              <div
                key={pos.storeId}
                className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-red-600 dark:text-red-400 font-bold text-sm">K</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {pos.storeName}
                      </h3>
                      {pos.cityName && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{pos.cityName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {pos.totalStock.toLocaleString('ru-RU')} <span className="text-xs font-normal text-gray-400">шт</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {pos.productCount} {pos.productCount === 1 ? 'товар' : pos.productCount < 5 ? 'товара' : 'товаров'}
                      </p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-semibold text-emerald-600">
                        {(pos.totalValue || 0) >= 1_000_000 ? `${((pos.totalValue || 0) / 1_000_000).toFixed(1)}M` : (pos.totalValue || 0).toLocaleString('ru-RU')} ₸
                      </p>
                      <p className="text-[10px] text-gray-400">стоимость</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer totals */}
          <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Итого: {posList.length} {posList.length === 1 ? 'точка' : posList.length < 5 ? 'точки' : 'точек'}
              </span>
              <div className="flex items-center gap-5">
                <span className="font-bold text-gray-900 dark:text-white">
                  {totalStock.toLocaleString('ru-RU')} шт
                </span>
                <span className="font-bold text-emerald-600 min-w-[80px] text-right">
                  {totalValue >= 1_000_000 ? `${(totalValue / 1_000_000).toFixed(1)}M` : totalValue.toLocaleString('ru-RU')} ₸
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : !error && !loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm text-center">
          <Store className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Нет точек выдачи</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Точки выдачи появятся после подключения кабинета Kaspi
          </p>
        </div>
      ) : null}

      {/* Refreshing indicator */}
      {refreshing && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 z-40">
          <Loader2 className="w-4 h-4 animate-spin" />
          Обновление...
        </div>
      )}
    </div>
  );
}
