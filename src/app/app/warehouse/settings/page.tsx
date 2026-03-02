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
  Settings,
  ArrowRightLeft,
  Clock,
  HelpCircle,
  X,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase/client';
import { getStale, setCache } from '@/lib/cache';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

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

  // Stock settings
  const [stockSyncMode, setStockSyncMode] = useState<'separate' | 'synced'>('separate');
  const [showStockModeHelp, setShowStockModeHelp] = useState(false);
  const [autoPreorderEnabled, setAutoPreorderEnabled] = useState(false);
  const [autoPreorderDays, setAutoPreorderDays] = useState(7);
  const [autoPreorderMode, setAutoPreorderMode] = useState<'all' | 'selective'>('all');
  const [autoPreorderSkus, setAutoPreorderSkus] = useState<Record<string, number>>({});
  const [allProducts, setAllProducts] = useState<Array<{ kaspi_id: string; name: string }>>([]);
  const [preorderSearch, setPreorderSearch] = useState('');
  const [showPreorderPicker, setShowPreorderPicker] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Load store settings
  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('stores')
          .select('stock_sync_mode, auto_preorder_enabled, auto_preorder_days, auto_preorder_mode, auto_preorder_skus')
          .eq('id', store.id)
          .single();
        if (data) {
          setStockSyncMode(((data as any).stock_sync_mode === 'synced' ? 'synced' : 'separate'));
          setAutoPreorderEnabled((data as any).auto_preorder_enabled || false);
          setAutoPreorderDays((data as any).auto_preorder_days || 7);
          setAutoPreorderMode((data as any).auto_preorder_mode === 'selective' ? 'selective' : 'all');
          const rawSkus = (data as any).auto_preorder_skus;
          // Support both old array format and new {sku: days} object
          if (rawSkus && typeof rawSkus === 'object' && !Array.isArray(rawSkus)) {
            setAutoPreorderSkus(rawSkus);
          } else if (Array.isArray(rawSkus)) {
            const obj: Record<string, number> = {};
            for (const s of rawSkus) obj[s] = (data as any).auto_preorder_days || 7;
            setAutoPreorderSkus(obj);
          } else {
            setAutoPreorderSkus({});
          }
        }
        // Load products for selective picker
        const { data: prods } = await supabase
          .from('products')
          .select('kaspi_id, name')
          .eq('store_id', store.id)
          .order('name', { ascending: true });
        if (prods) setAllProducts(prods.map(p => ({ kaspi_id: p.kaspi_id || '', name: p.name })));
      } catch (err) {
        console.error('Failed to load store settings:', err);
      } finally {
        setSettingsLoading(false);
      }
    })();
  }, [store?.id]);

  const saveSetting = async (field: string, value: unknown) => {
    if (!store?.id) return;
    setSettingsSaving(true);
    try {
      await supabase.from('stores').update({ [field]: value } as any).eq('id', store.id);
    } catch (err) {
      console.error('Failed to save setting:', err);
    } finally {
      setSettingsSaving(false);
    }
  };

  // POS data
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
      const [dbResult, cabinetRes] = await Promise.all([
        supabase
          .from('products')
          .select('sku, price')
          .eq('store_id', store.id)
          .not('sku', 'is', null),
        fetchWithAuth('/api/kaspi/cabinet/products').then(r => r.json()).catch(() => ({ success: false })),
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

      const dbSkus = new Set<string>();
      const dbPriceMap = new Map<string, number>();
      for (const p of dbResult.data || []) {
        if (p.sku) {
          dbSkus.add(p.sku);
          if (p.price) dbPriceMap.set(p.sku, p.price);
        }
      }

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
  if (userLoading || settingsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mb-6">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-gray-900 dark:text-white">Настройки склада</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Режим синхронизации, предзаказ и точки продаж</p>
          </div>
        </div>
      </div>

      {/* Stock Sync Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 sm:p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white">Режим склада</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Как синхронизировать остатки с Kaspi</p>
          </div>
          <button
            onClick={() => setShowStockModeHelp(!showStockModeHelp)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {showStockModeHelp && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl relative">
            <button
              onClick={() => setShowStockModeHelp(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-300 mb-2">Для чего нужен режим склада?</h4>
            <div className="space-y-2 text-xs text-blue-700 dark:text-blue-300/80 leading-relaxed">
              <p>
                <span className="font-semibold">Раздельный режим</span> — у вас два независимых остатка:
                фактический склад (сколько товара реально есть) и остаток Kaspi (что видят покупатели).
                Это полезно когда вы хотите контролировать наличие на Kaspi отдельно,
                например показывать товар в наличии даже если на складе мало остатков, чтобы не потерять позиции в выдаче.
                Вся аналитика (прибыль, себестоимость, складские остатки) считается по фактическим данным вашего склада — так вы видите реальную картину бизнеса, а не виртуальные цифры Kaspi.
              </p>
              <p>
                <span className="font-semibold">Синхронизированный режим</span> — один остаток на всё.
                Что на складе = что на Kaspi. При продаже или приёмке остаток обновляется везде автоматически.
                Подходит если вы не хотите управлять остатками вручную.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Separate mode */}
          <button
            onClick={() => {
              setStockSyncMode('separate');
              saveSetting('stock_sync_mode', 'separate');
            }}
            className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
              stockSyncMode === 'separate'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {stockSyncMode === 'separate' && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Раздельный</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Два независимых остатка: факт. склад и остаток Kaspi. Можно редактировать отдельно.
            </p>
          </button>

          {/* Synced mode */}
          <button
            onClick={() => {
              setStockSyncMode('synced');
              saveSetting('stock_sync_mode', 'synced');
            }}
            className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
              stockSyncMode === 'synced'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {stockSyncMode === 'synced' && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Синхронизированный</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Один остаток = Kaspi. Ваш склад напрямую синхронизирован с Kaspi.
            </p>
          </button>
        </div>
      </div>

      {/* Auto-preorder */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 sm:p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white">Авто-предзаказ</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Когда остаток = 0, автоматически включить предзаказ</p>
          </div>
          <button
            onClick={() => {
              const next = !autoPreorderEnabled;
              setAutoPreorderEnabled(next);
              saveSetting('auto_preorder_enabled', next);
            }}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              autoPreorderEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                autoPreorderEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {autoPreorderEnabled && (
          <div className="space-y-4">
            {/* Режим: все или выборочно */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                Применить к товарам
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => {
                    setAutoPreorderMode('all');
                    saveSetting('auto_preorder_mode', 'all');
                  }}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    autoPreorderMode === 'all'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Все товары
                </button>
                <button
                  onClick={() => {
                    setAutoPreorderMode('selective');
                    saveSetting('auto_preorder_mode', 'selective');
                  }}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    autoPreorderMode === 'selective'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Выборочно
                </button>
              </div>

              {/* Режим "Все товары" — один общий срок */}
              {autoPreorderMode === 'all' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Срок:</label>
                    <input
                      type="number"
                      value={autoPreorderDays}
                      onChange={e => {
                        const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                        setAutoPreorderDays(v);
                      }}
                      onBlur={() => saveSetting('auto_preorder_days', autoPreorderDays)}
                      className="w-20 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      min="1"
                      max="30"
                    />
                    <span className="text-xs text-gray-400">дней (1–30)</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    При нулевом остатке любого товара — автоматически включится предзаказ на {autoPreorderDays} дн.
                  </p>
                </div>
              )}

              {/* Режим "Выборочно" — каждый товар со своим сроком */}
              {autoPreorderMode === 'selective' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Укажите товары и срок предзаказа для каждого. При нулевом остатке — включится предзаказ на указанный срок.
                  </p>

                  {/* Список выбранных товаров */}
                  {Object.keys(autoPreorderSkus).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(autoPreorderSkus).map(([sku, days]) => {
                        const prod = allProducts.find(p => p.kaspi_id === sku);
                        return (
                          <div key={sku} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{prod?.name || sku}</span>
                            <input
                              type="number"
                              value={days}
                              onChange={e => {
                                const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                                const next = { ...autoPreorderSkus, [sku]: v };
                                setAutoPreorderSkus(next);
                              }}
                              onBlur={() => saveSetting('auto_preorder_skus', autoPreorderSkus)}
                              className="w-16 px-2 py-1 text-sm text-center border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                              min="1"
                              max="30"
                            />
                            <span className="text-xs text-gray-400 shrink-0">дн.</span>
                            <button
                              onClick={() => {
                                const next = { ...autoPreorderSkus };
                                delete next[sku];
                                setAutoPreorderSkus(next);
                                saveSetting('auto_preorder_skus', next);
                              }}
                              className="text-gray-400 hover:text-red-500 cursor-pointer p-0.5"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Кнопка добавить */}
                  <button
                    onClick={() => { setShowPreorderPicker(!showPreorderPicker); setPreorderSearch(''); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Добавить товары
                  </button>

                  {/* Попап выбора товаров */}
                  {showPreorderPicker && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <input
                          type="text"
                          value={preorderSearch}
                          onChange={e => setPreorderSearch(e.target.value)}
                          placeholder="Поиск товара..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {allProducts
                          .filter(p => !(p.kaspi_id in autoPreorderSkus))
                          .filter(p => !preorderSearch || p.name.toLowerCase().includes(preorderSearch.toLowerCase()))
                          .slice(0, 50)
                          .map(p => (
                            <button
                              key={p.kaspi_id}
                              onClick={() => {
                                const next = { ...autoPreorderSkus, [p.kaspi_id]: 7 };
                                setAutoPreorderSkus(next);
                                saveSetting('auto_preorder_skus', next);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
                            >
                              {p.name}
                            </button>
                          ))}
                        {allProducts.filter(p => !(p.kaspi_id in autoPreorderSkus)).filter(p => !preorderSearch || p.name.toLowerCase().includes(preorderSearch.toLowerCase())).length === 0 && (
                          <p className="text-center text-xs text-gray-400 py-4">Нет товаров</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* POS Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 sm:p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Точки продаж</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ваши точки выдачи Kaspi и остатки по ним</p>
            </div>
          </div>
          <button
            onClick={() => loadPOSData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Точек</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{posList.length}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Позиций</p>
              <p className="text-sm font-bold text-emerald-600">{totalProducts}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Всего шт</p>
              <p className="text-sm font-bold text-amber-600">{totalStock.toLocaleString('ru-RU')}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Стоимость</p>
              <p className="text-sm font-bold text-purple-600">{totalValue >= 1_000_000 ? `${(totalValue / 1_000_000).toFixed(1)}M` : totalValue.toLocaleString('ru-RU')} ₸</p>
            </div>
          </div>
        )}

        {/* POS List */}
        {posList.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {posList.map((pos) => (
              <div
                key={pos.storeId}
                className="py-3 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg px-2 -mx-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-red-600 dark:text-red-400 font-bold text-xs">K</span>
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
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !error ? (
          <div className="text-center py-8">
            <Store className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Точки выдачи появятся после подключения кабинета Kaspi
            </p>
          </div>
        ) : null}
      </div>

      {/* Saving indicator */}
      {settingsSaving && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 z-40">
          <Loader2 className="w-4 h-4 animate-spin" />
          Сохранение...
        </div>
      )}

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
