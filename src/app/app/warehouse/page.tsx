'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Package,
  Settings,
  History,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Edit3,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase/client';
import { getStale, setCache } from '@/lib/cache';

interface Availability {
  storeName: string;
  stockCount: number;
}

interface Product {
  id: string;
  kaspi_id: string | null;
  name: string;
  sku: string | null;
  price: number | null;
  cost_price: number | null;
  quantity: number | null;
  image_url: string | null;
  category: string | null;
  active: boolean | null;
  availabilities?: Availability[];
}

export default function WarehousePage() {
  const { user, store, loading: userLoading } = useUser();

  // Products from Supabase
  const cacheKey = store?.id ? `warehouse_products_${store.id}` : '';
  const stale = cacheKey ? getStale<Product[]>(cacheKey) : null;

  const [products, setProducts] = useState<Product[]>(stale?.data || []);
  const [loading, setLoading] = useState(!stale);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'cost_price' | 'quantity' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Load products from Supabase + live stock from Kaspi Cabinet
  const loadProducts = useCallback(async (showRefresh = false) => {
    if (!store?.id || !user?.id) return;
    const hasCached = products.length > 0;
    if (!hasCached) setLoading(true);
    if (showRefresh) setRefreshing(true);

    try {
      // Parallel: DB products (cost_price, id) + Cabinet stock (live quantity)
      const [dbResult, cabinetResult] = await Promise.all([
        supabase
          .from('products')
          .select('id, kaspi_id, name, sku, price, cost_price, quantity, image_url, category, active')
          .eq('store_id', store.id)
          .order('name', { ascending: true })
          .limit(500),
        fetch(`/api/kaspi/cabinet/products?userId=${user.id}`)
          .then(r => r.json())
          .catch(() => ({ success: false })),
      ]);

      if (dbResult.error) throw dbResult.error;
      const dbProducts: Product[] = (dbResult.data || [])
        .filter(p => p.name && p.name.trim() !== '')
        .map(p => ({ ...p, availabilities: undefined }));

      // Merge live stock + availabilities from Cabinet by SKU
      const updatedIds: { id: string; quantity: number }[] = [];
      if (cabinetResult.success && cabinetResult.products) {
        const stockMap = new Map<string, { stock: number; availabilities: Availability[] }>();
        for (const kp of cabinetResult.products) {
          if (kp.sku) {
            const avails: Availability[] = (kp.availabilities || [])
              .filter((a: any) => a.stockCount > 0)
              .map((a: any) => ({
                storeName: a.storeName || a.storeId || '—',
                stockCount: a.stockCount,
              }));
            stockMap.set(kp.sku, { stock: kp.stock ?? 0, availabilities: avails });
          }
        }
        for (const p of dbProducts) {
          if (p.sku && stockMap.has(p.sku)) {
            const info = stockMap.get(p.sku)!;
            if (p.quantity !== info.stock) {
              updatedIds.push({ id: p.id, quantity: info.stock });
            }
            p.quantity = info.stock;
            p.availabilities = info.availabilities;
          }
        }
      }

      setProducts(dbProducts);
      if (cacheKey) setCache(cacheKey, dbProducts);

      // Fire-and-forget: save updated quantities to DB for instant load next time
      if (updatedIds.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < updatedIds.length; i += batchSize) {
          const batch = updatedIds.slice(i, i + batchSize);
          Promise.all(
            batch.map(({ id, quantity }) =>
              supabase.from('products').update({ quantity }).eq('id', id)
            )
          ).catch(err => console.error('Stock sync to DB error:', err));
        }
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [store?.id, user?.id, cacheKey]);

  useEffect(() => {
    if (store?.id && user?.id) loadProducts();
  }, [store?.id, user?.id]);

  // Inline edit handlers
  const startEdit = (id: string, field: 'cost_price' | 'quantity', currentValue: number | null) => {
    setEditingCell({ id, field });
    setEditValue(currentValue !== null ? String(currentValue) : '');
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = useCallback(async () => {
    if (!editingCell || !store?.id) return;
    setSaving(true);

    const value = editValue.trim() === '' ? null : parseFloat(editValue);
    if (value !== null && (isNaN(value) || value < 0)) {
      setSaving(false);
      return;
    }

    try {
      const update = editingCell.field === 'cost_price'
        ? { cost_price: value }
        : { quantity: value !== null ? Math.round(value) : 0 };

      const { error } = await supabase
        .from('products')
        .update(update)
        .eq('id', editingCell.id);

      if (error) throw error;

      const updatedProducts = products.map(p =>
        p.id === editingCell.id
          ? { ...p, ...update }
          : p
      );
      setProducts(updatedProducts);
      if (cacheKey) setCache(cacheKey, updatedProducts);

      const label = editingCell.field === 'cost_price' ? 'Себестоимость' : 'Количество';
      setToast({ message: `${label} обновлено`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setToast({ message: 'Ошибка сохранения', type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, editValue, store?.id, products, cacheKey]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  // Filtering
  const filtered = products.filter(p => {
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLowStock = !showLowStockOnly || (p.quantity ?? 0) < 5;
    return matchesSearch && matchesLowStock;
  });

  // Stats
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + ((p.price ?? 0) * (p.quantity ?? 0)), 0);
  const costPriceSet = products.filter(p => p.cost_price !== null).length;
  const totalCostValue = products.reduce((sum, p) => sum + ((p.cost_price ?? 0) * (p.quantity ?? 0)), 0);
  const lowStockCount = products.filter(p => (p.quantity ?? 0) < 5).length;

  // Filtered totals
  const filteredQty = filtered.reduce((sum, p) => sum + (p.quantity ?? 0), 0);
  const filteredCost = filtered.reduce((sum, p) => sum + ((p.cost_price ?? 0) * (p.quantity ?? 0)), 0);
  const filteredValue = filtered.reduce((sum, p) => sum + ((p.price ?? 0) * (p.quantity ?? 0)), 0);

  // Loading skeleton
  if (userLoading || (loading && products.length === 0)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-52 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 dark:border-gray-700/50">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Mobile Edit Modal */}
      {editingCell && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={cancelEdit} />
          <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-2xl p-6 pb-8">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editingCell.field === 'cost_price' ? 'Себестоимость' : 'Количество'}
            </h3>
            <div className="flex items-center gap-3 mb-6">
              <input
                ref={editInputRef}
                type="number"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="flex-1 px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={editingCell.field === 'cost_price' ? 'Цена закупки' : 'Количество'}
                min="0"
                autoFocus
              />
              <span className="text-gray-500 dark:text-gray-400">
                {editingCell.field === 'cost_price' ? '₸' : 'шт'}
              </span>
            </div>
            <div className="flex gap-3">
              <button onClick={cancelEdit} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium cursor-pointer">
                Отмена
              </button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium cursor-pointer disabled:opacity-50">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Склад</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Остатки и себестоимость товаров</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadProducts(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
          <Link
            href="/app/warehouse/history"
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Приёмки</span>
          </Link>
          <Link
            href="/app/warehouse/settings"
            className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Товаров</p>
              <p className="text-sm lg:text-base font-bold text-gray-900 dark:text-white">{totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Стоимость запасов</p>
              <p className="text-sm lg:text-base font-bold text-emerald-600">{totalValue.toLocaleString('ru-RU')} ₸</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Себестоимость</p>
              <p className="text-sm lg:text-base font-bold text-amber-600">
                {costPriceSet} <span className="text-xs font-normal text-gray-400">из {totalProducts}</span>
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm text-left transition-all cursor-pointer ${
            showLowStockOnly ? 'ring-2 ring-red-400' : 'hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Низкий остаток</p>
              <p className="text-sm lg:text-base font-bold text-red-500">{lowStockCount}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Поиск по названию или SKU..."
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 transition-colors dark:text-white dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm text-center">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Нет товаров</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Товары добавляются автоматически при синхронизации заказов с Kaspi
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map(product => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{product.sku || '—'}</p>
                  </div>
                  {(product.quantity ?? 0) < 5 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-medium rounded">
                      Мало
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => startEdit(product.id, 'quantity', product.quantity)}
                      className="flex items-center gap-1 font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {product.quantity ?? 0} шт
                      <Edit3 className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={() => startEdit(product.id, 'cost_price', product.cost_price)}
                      className="flex items-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {product.cost_price !== null ? (
                        <span className="text-gray-500 dark:text-gray-400">
                          <span className="text-[10px] opacity-60">себ.</span> {product.cost_price.toLocaleString('ru-RU')} ₸
                          <Edit3 className="w-3 h-3 text-gray-400 inline ml-0.5" />
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium rounded">
                          Указать себест.
                        </span>
                      )}
                    </button>
                  </div>
                  <span className="text-emerald-600 font-semibold">{(product.price ?? 0).toLocaleString('ru-RU')} ₸</span>
                </div>
                {product.availabilities && product.availabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.availabilities.map((a, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] rounded">
                        {a.storeName}: {a.stockCount}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {/* Mobile total */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Итого: {filteredQty} шт</span>
                <span className="font-bold text-emerald-600">{filteredValue.toLocaleString('ru-RU')} ₸</span>
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Товар</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Кол-во</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Себестоимость</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Цена продажи</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Стоимость</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => (
                  <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Product */}
                    <td className="py-3 px-6">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[300px] text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.sku || '—'}</p>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4">
                      {editingCell?.id === product.id && editingCell.field === 'quantity' ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={editInputRef}
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="w-20 px-2 py-1 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            min="0"
                          />
                          <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded cursor-pointer">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <button
                            onClick={() => startEdit(product.id, 'quantity', product.quantity)}
                            className="group flex items-center gap-1 cursor-pointer"
                          >
                            <span className={`text-sm font-semibold ${
                              (product.quantity ?? 0) < 5 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                            }`}>
                              {product.quantity ?? 0} шт
                            </span>
                            <Edit3 className="w-3 h-3 text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          {product.availabilities && product.availabilities.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.availabilities.map((a, i) => (
                                <span key={i} className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {a.storeName}: {a.stockCount}{i < product.availabilities!.length - 1 ? ' ·' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Cost Price */}
                    <td className="py-3 px-4">
                      {editingCell?.id === product.id && editingCell.field === 'cost_price' ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={editInputRef}
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="w-28 px-2 py-1 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            min="0"
                            placeholder="Себестоимость"
                          />
                          <span className="text-xs text-gray-400">₸</span>
                          <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded cursor-pointer">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : product.cost_price !== null ? (
                        <button
                          onClick={() => startEdit(product.id, 'cost_price', product.cost_price)}
                          className="group flex items-center gap-1 cursor-pointer"
                        >
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {product.cost_price.toLocaleString('ru-RU')} ₸
                          </span>
                          <Edit3 className="w-3 h-3 text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(product.id, 'cost_price', null)}
                          className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-medium cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                        >
                          Указать
                        </button>
                      )}
                    </td>

                    {/* Sell Price */}
                    <td className="py-3 px-4">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(product.price ?? 0).toLocaleString('ru-RU')} ₸
                      </span>
                    </td>

                    {/* Total Value */}
                    <td className="py-3 px-4">
                      <span className="text-sm font-semibold text-emerald-600">
                        {((product.price ?? 0) * (product.quantity ?? 0)).toLocaleString('ru-RU')} ₸
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <tr>
                  <td className="py-3 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Итого</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">{filteredQty} шт</td>
                  <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">{filteredCost.toLocaleString('ru-RU')} ₸</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-sm font-bold text-emerald-600">{filteredValue.toLocaleString('ru-RU')} ₸</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
