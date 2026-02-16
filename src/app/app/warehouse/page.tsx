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
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Sliders,
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
  kaspi_stock: number | null;
  image_url: string | null;
  category: string | null;
  active: boolean | null;
  product_group: string | null;
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

  // Dynamic product groups
  interface ProductGroupMeta { id: string; name: string; slug: string; color: string; }
  const [groups, setGroups] = useState<ProductGroupMeta[]>([]);
  const [groupMenuId, setGroupMenuId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const PRESET_COLORS = [
    '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280',
  ];

  const getGroupInfo = (slug: string | null) => {
    if (!slug) return null;
    return groups.find(g => g.slug === slug) || { id: '', name: slug, slug, color: '#6b7280' };
  };

  const loadGroups = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/product-groups?userId=${user.id}`);
      const json = await res.json();
      if (json.success) setGroups(json.data);
    } catch (e) { console.error('Failed to load groups:', e); }
  }, [user?.id]);

  const createGroup = async () => {
    if (!user?.id || !newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await fetch('/api/product-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: newGroupName.trim(), color: newGroupColor }),
      });
      const json = await res.json();
      if (json.success) {
        setGroups(prev => [...prev, json.data]);
        setNewGroupName('');
        setShowCreateGroup(false);
      } else {
        setToast({ message: json.message || 'Ошибка', type: 'error' });
      }
    } catch (e) { console.error('Failed to create group:', e); }
    setCreatingGroup(false);
  };

  const deleteGroup = async (slug: string) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/product-groups?userId=${user.id}&slug=${slug}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setGroups(prev => prev.filter(g => g.slug !== slug));
        setProducts(prev => prev.map(p => p.product_group === slug ? { ...p, product_group: null } : p));
        if (groupFilter === slug) setGroupFilter(null);
      }
    } catch (e) { console.error('Failed to delete group:', e); }
  };

  const updateProductGroup = async (productId: string, kaspiId: string | null, group: string | null) => {
    if (!user?.id || !kaspiId) return;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, product_group: group } : p));
    setGroupMenuId(null);
    try {
      await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, kaspiId, productGroup: group }),
      });
    } catch (e) { console.error('Failed to update group:', e); }
  };

  // Filters, sorting & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  type SortField = 'name' | 'quantity' | 'cost_price' | 'price' | 'value';
  type SortDir = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  // Expense rates (persisted to localStorage)
  interface ExpenseRates { ad: number; commission: number; tax: number; delivery: number; }
  const EXPENSE_KEY = 'metricon_expense_rates';
  const defaultRates: ExpenseRates = { ad: 8, commission: 12, tax: 4, delivery: 2 };
  const [expenseRates, setExpenseRates] = useState<ExpenseRates>(() => {
    if (typeof window === 'undefined') return defaultRates;
    try {
      const saved = localStorage.getItem(EXPENSE_KEY);
      return saved ? { ...defaultRates, ...JSON.parse(saved) } : defaultRates;
    } catch { return defaultRates; }
  });
  const [showExpensePanel, setShowExpensePanel] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenseRates));
    }
  }, [expenseRates]);

  const totalExpenseRate = expenseRates.ad + expenseRates.commission + expenseRates.tax + expenseRates.delivery;

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
          .select('id, kaspi_id, name, sku, price, cost_price, quantity, kaspi_stock, image_url, category, active, product_group')
          .eq('store_id', store.id)
          .order('name', { ascending: true })
          .limit(500),
        fetch(`/api/kaspi/cabinet/products?userId=${user.id}`)
          .then(r => r.json())
          .catch(() => ({ success: false })),
      ]);

      if (dbResult.error) throw dbResult.error;
      const dbProducts: Product[] = ((dbResult.data || []) as any[])
        .filter(p => p.name && p.name.trim() !== '')
        .map(p => ({ ...p, availabilities: undefined }));

      // Merge live stock + availabilities from Cabinet by SKU
      const kaspiStockUpdates: { id: string; kaspi_stock: number }[] = [];
      if (cabinetResult.success && cabinetResult.products) {
        const stockMap = new Map<string, { stock: number; availabilities: Availability[]; name: string; price: number; category: string | null; image_url: string | null }>();
        for (const kp of cabinetResult.products) {
          if (kp.sku) {
            const avails: Availability[] = (kp.availabilities || [])
              .filter((a: any) => a.stockCount > 0)
              .map((a: any) => ({
                storeName: a.storeName || a.storeId || '—',
                stockCount: a.stockCount,
              }));
            stockMap.set(kp.sku, {
              stock: kp.stock ?? 0,
              availabilities: avails,
              name: kp.name || '',
              price: kp.price || 0,
              category: kp.category || null,
              image_url: kp.images?.[0] || null,
            });
          }
        }

        // Дедупликация: удаляем дубликаты по SKU (оставляем с cost_price или первый)
        const skuGroups = new Map<string, Product[]>();
        for (const p of dbProducts) {
          if (!p.sku) continue;
          const group = skuGroups.get(p.sku) || [];
          group.push(p);
          skuGroups.set(p.sku, group);
        }
        const duplicateIdsToDelete: string[] = [];
        for (const [, group] of skuGroups) {
          if (group.length <= 1) continue;
          // Оставляем товар с cost_price, иначе первый
          group.sort((a, b) => {
            if (a.cost_price !== null && b.cost_price === null) return -1;
            if (a.cost_price === null && b.cost_price !== null) return 1;
            return 0;
          });
          const keep = group[0];
          for (let i = 1; i < group.length; i++) {
            duplicateIdsToDelete.push(group[i].id);
            // Перенести cost_price если у удаляемого есть, а у оставляемого нет
            if (keep.cost_price === null && group[i].cost_price !== null) {
              keep.cost_price = group[i].cost_price;
            }
          }
        }
        if (duplicateIdsToDelete.length > 0) {
          console.log(`Warehouse: removing ${duplicateIdsToDelete.length} duplicate products`);
          // Удаляем пачками по 20
          for (let i = 0; i < duplicateIdsToDelete.length; i += 20) {
            const batch = duplicateIdsToDelete.slice(i, i + 20);
            await supabase.from('products').delete().in('id', batch);
          }
          // Убираем из локального массива
          const deleteSet = new Set(duplicateIdsToDelete);
          const cleaned = dbProducts.filter(p => !deleteSet.has(p.id));
          dbProducts.length = 0;
          dbProducts.push(...cleaned);
        }

        // Обновляем существующие товары (kaspi_stock из API, quantity НЕ трогаем — это факт склад)
        const existingSkus = new Set(dbProducts.map(p => p.sku).filter(Boolean));
        const existingKaspiIds = new Set(dbProducts.map(p => p.kaspi_id).filter(Boolean));
        for (const p of dbProducts) {
          if (p.sku && stockMap.has(p.sku)) {
            const info = stockMap.get(p.sku)!;
            if (p.kaspi_stock !== info.stock) {
              kaspiStockUpdates.push({ id: p.id, kaspi_stock: info.stock });
            }
            p.kaspi_stock = info.stock;
            p.availabilities = info.availabilities;
          }
        }

        // Добавляем товары из кабинета которых нет в БД (проверяем и sku, и kaspi_id)
        const missingProducts: Array<{ sku: string; name: string; price: number; quantity: number; kaspi_stock: number; category: string | null; image_url: string | null; availabilities: Availability[] }> = [];
        for (const [sku, info] of stockMap) {
          if (!existingSkus.has(sku) && !existingKaspiIds.has(sku) && info.name) {
            missingProducts.push({ sku, ...info, quantity: 0, kaspi_stock: info.stock });
          }
        }

        if (missingProducts.length > 0) {
          // Вставляем в БД
          const inserts = missingProducts.map(mp => ({
            store_id: store.id,
            kaspi_id: mp.sku,
            name: mp.name,
            sku: mp.sku,
            price: mp.price,
            quantity: mp.quantity,
            kaspi_stock: mp.kaspi_stock,
            category: mp.category,
            image_url: mp.image_url,
            active: true,
          }));

          const { data: inserted } = await supabase
            .from('products')
            .insert(inserts as any)
            .select('id, kaspi_id, name, sku, price, cost_price, quantity, kaspi_stock, image_url, category, active, product_group');

          // Добавляем в список для отображения
          if (inserted) {
            for (const row of inserted as any[]) {
              const mp = missingProducts.find(m => m.sku === row.sku);
              dbProducts.push({
                ...row,
                availabilities: mp?.availabilities,
              });
            }
          }

          console.log(`Warehouse: inserted ${inserted?.length || 0} missing products from cabinet`);
        }
      }

      // Сортируем по имени
      dbProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setProducts(dbProducts);
      if (cacheKey) setCache(cacheKey, dbProducts);

      // Fire-and-forget: save kaspi_stock to DB (quantity НЕ перезаписываем — это факт склад)
      if (kaspiStockUpdates.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < kaspiStockUpdates.length; i += batchSize) {
          const batch = kaspiStockUpdates.slice(i, i + batchSize);
          Promise.all(
            batch.map(({ id, kaspi_stock }) =>
              supabase.from('products').update({ kaspi_stock } as any).eq('id', id)
            )
          ).catch(err => console.error('Kaspi stock sync to DB error:', err));
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
    if (store?.id && user?.id) {
      loadProducts();
      loadGroups();
    }
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
    const matchesGroup = groupFilter === null ? true
      : groupFilter === 'none' ? !p.product_group
      : p.product_group === groupFilter;
    return matchesSearch && matchesLowStock && matchesGroup;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name': return dir * (a.name || '').localeCompare(b.name || '');
      case 'quantity': return dir * ((a.quantity ?? 0) - (b.quantity ?? 0));
      case 'cost_price': return dir * ((a.cost_price ?? 0) - (b.cost_price ?? 0));
      case 'price': return dir * ((a.price ?? 0) - (b.price ?? 0));
      case 'value': return dir * (((a.price ?? 0) * (a.quantity ?? 0)) - ((b.price ?? 0) * (b.quantity ?? 0)));
      default: return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Stats
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + ((p.price ?? 0) * (p.quantity ?? 0)), 0);
  const costPriceSet = products.filter(p => p.cost_price !== null).length;
  const totalCostValue = products.reduce((sum, p) => sum + ((p.cost_price ?? 0) * (p.quantity ?? 0)), 0);
  const lowStockCount = products.filter(p => (p.quantity ?? 0) < 5).length;

  // Profit: revenue - cost - expenses (only for products with cost_price)
  const totalExpenses = Math.round(totalValue * totalExpenseRate / 100);
  const expectedProfit = totalValue - totalCostValue - totalExpenses;

  // Filtered totals
  const filteredQty = filtered.reduce((sum, p) => sum + (p.quantity ?? 0), 0);
  const filteredCost = filtered.reduce((sum, p) => sum + ((p.cost_price ?? 0) * (p.quantity ?? 0)), 0);
  const filteredValue = filtered.reduce((sum, p) => sum + ((p.price ?? 0) * (p.quantity ?? 0)), 0);
  const filteredExpenses = Math.round(filteredValue * totalExpenseRate / 100);
  const filteredProfit = filteredValue - filteredCost - filteredExpenses;

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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen relative" onClick={() => groupMenuId && setGroupMenuId(null)}>
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
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
              <p className="text-sm lg:text-base font-bold text-amber-600">{totalCostValue.toLocaleString('ru-RU')} ₸</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowExpensePanel(!showExpensePanel)}
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm text-left transition-all cursor-pointer ${
            showExpensePanel ? 'ring-2 ring-purple-400' : 'hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">
                Ож. прибыль <span className="opacity-60">({totalExpenseRate}%)</span>
              </p>
              <p className={`text-sm lg:text-base font-bold ${expectedProfit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                {expectedProfit.toLocaleString('ru-RU')} ₸
              </p>
            </div>
          </div>
        </button>
        <button
          onClick={() => { setShowLowStockOnly(!showLowStockOnly); setPage(0); }}
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

      {/* Expense rates panel */}
      {showExpensePanel && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Расходы (% от выручки)</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {([
              ['ad', 'Реклама'],
              ['commission', 'Комиссия Kaspi'],
              ['tax', 'Налог'],
              ['delivery', 'Доставка'],
            ] as [keyof ExpenseRates, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={expenseRates[key]}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      setExpenseRates(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, v)) }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                  <span className="text-sm text-gray-400 shrink-0">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Итого расходы: <span className="font-semibold text-gray-700 dark:text-gray-300">{totalExpenseRate}%</span></span>
            <span>Расходы: <span className="font-semibold text-gray-700 dark:text-gray-300">{totalExpenses.toLocaleString('ru-RU')} ₸</span></span>
            <span>Прибыль: <span className={`font-semibold ${expectedProfit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{expectedProfit.toLocaleString('ru-RU')} ₸</span></span>
            <span>Маржа: <span className={`font-semibold ${expectedProfit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{totalValue > 0 ? ((expectedProfit / totalValue) * 100).toFixed(1) : '0'}%</span></span>
          </div>
        </div>
      )}

      {/* Search & group filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            placeholder="Поиск по названию или SKU..."
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 transition-colors dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { slug: null, name: 'Все', color: '#6b7280' },
            ...groups.map(g => ({ slug: g.slug, name: g.name, color: g.color })),
            { slug: 'none', name: 'Без группы', color: '#6b7280' },
          ].map(({ slug, name, color }) => {
            const count = slug === null ? products.length
              : slug === 'none' ? products.filter(p => !p.product_group).length
              : products.filter(p => p.product_group === slug).length;
            return (
              <button
                key={slug ?? 'all'}
                onClick={() => { setGroupFilter(slug); setPage(0); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (slug && slug !== 'none' && confirm(`Удалить группу "${name}"? Товары будут откреплены.`)) {
                    deleteGroup(slug);
                  }
                }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  groupFilter === slug
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={groupFilter === slug ? { backgroundColor: color, color: '#fff' } : undefined}
              >
                {name} ({count})
              </button>
            );
          })}
          {/* Create group button */}
          <div className="relative">
            <button
              onClick={() => setShowCreateGroup(!showCreateGroup)}
              className="px-3 py-1.5 text-xs rounded-lg font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              +
            </button>
            {showCreateGroup && (
              <div className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 p-3 w-56">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Название группы"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-400 mb-2"
                  onKeyDown={e => { if (e.key === 'Enter') createGroup(); }}
                  autoFocus
                />
                <div className="flex gap-1.5 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewGroupColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${newGroupColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={createGroup}
                  disabled={!newGroupName.trim() || creatingGroup}
                  className="w-full py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {creatingGroup ? 'Создание...' : 'Создать'}
                </button>
              </div>
            )}
          </div>
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
          {/* Mobile sort */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
            {([
              ['name', 'Название'],
              ['quantity', 'Кол-во'],
              ['cost_price', 'Себест.'],
              ['price', 'Цена'],
              ['value', 'Стоимость'],
            ] as [SortField, string][]).map(([field, label]) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortField === field
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-sm'
                }`}
              >
                {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
              </button>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {paginated.map(product => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{product.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400">{product.sku || '—'}</p>
                      <div className="relative flex-shrink-0">
                        {(() => {
                          const gi = getGroupInfo(product.product_group);
                          return (
                            <>
                              <button
                                onClick={() => setGroupMenuId(groupMenuId === product.id ? null : product.id)}
                                className="px-1.5 py-0.5 text-[10px] rounded font-medium cursor-pointer transition-colors"
                                style={gi ? { color: gi.color, backgroundColor: gi.color + '20' } : { color: '#9ca3af', backgroundColor: '#f3f4f6' }}
                              >
                                {gi ? gi.name : '—'}
                              </button>
                              {groupMenuId === product.id && (
                                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 py-1 w-40">
                                  {groups.map(g => (
                                    <button
                                      key={g.slug}
                                      onClick={() => updateProductGroup(product.id, product.kaspi_id, g.slug)}
                                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 ${product.product_group === g.slug ? 'font-bold' : ''}`}
                                      style={{ color: g.color }}
                                    >
                                      {g.name}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => updateProductGroup(product.id, product.kaspi_id, null)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    Убрать
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
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
                      {product.quantity ?? 0}
                      {product.kaspi_stock != null && (
                        <span className="text-[10px] text-gray-400 font-normal">({product.kaspi_stock})</span>
                      )}
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
              {showExpensePanel && (
                <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400">Прибыль ({totalExpenseRate}%)</span>
                  <span className={`font-semibold ${filteredProfit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{filteredProfit.toLocaleString('ru-RU')} ₸</span>
                </div>
              )}
            </div>
            {/* Mobile pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                <button
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-30 transition-colors"
                >
                  ←
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {safePage + 1} / {totalPages} <span className="text-xs">({filtered.length})</span>
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-30 transition-colors"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full table-fixed">
              <colgroup>
                <col />
                <col className="w-[110px]" />
                <col className="w-[100px]" />
                <col className="w-[150px]" />
                <col className="w-[140px]" />
                <col className="w-[140px]" />
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {([
                    ['name', 'Товар', 'px-6'],
                    ['product_group' as SortField, 'Группа', 'px-4'],
                    ['quantity', 'Кол-во', 'px-4'],
                    ['cost_price', 'Себестоимость', 'px-4'],
                    ['price', 'Цена продажи', 'px-4'],
                    ['value', 'Стоимость', 'px-4'],
                  ] as [SortField, string, string][]).map(([field, label, px]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className={`text-left py-3 ${px} text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none transition-colors`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {sortField === field ? (
                          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        ) : (
                          <span className="w-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(product => (
                  <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Product */}
                    <td className="py-3 px-6">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.sku || '—'}</p>
                      </div>
                    </td>

                    {/* Group */}
                    <td className="py-3 px-4">
                      <div className="relative">
                        {(() => {
                          const gi = getGroupInfo(product.product_group);
                          return (
                            <>
                              <button
                                onClick={() => setGroupMenuId(groupMenuId === product.id ? null : product.id)}
                                className="px-2 py-1 text-[11px] rounded-md font-medium cursor-pointer transition-colors"
                                style={gi ? { color: gi.color, backgroundColor: gi.color + '20' } : { color: '#9ca3af', backgroundColor: '#f3f4f6' }}
                              >
                                {gi ? gi.name : '—'}
                              </button>
                              {groupMenuId === product.id && (
                                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 py-1 w-40">
                                  {groups.map(g => (
                                    <button
                                      key={g.slug}
                                      onClick={() => updateProductGroup(product.id, product.kaspi_id, g.slug)}
                                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 ${product.product_group === g.slug ? 'font-bold' : ''}`}
                                      style={{ color: g.color }}
                                    >
                                      {g.name}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => updateProductGroup(product.id, product.kaspi_id, null)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    Убрать
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
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
                              {product.quantity ?? 0}
                            </span>
                            {product.kaspi_stock != null && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                ({product.kaspi_stock})
                              </span>
                            )}
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
                {showExpensePanel && (
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-6 text-xs text-gray-500 dark:text-gray-400">Прибыль ({totalExpenseRate}%)</td>
                    <td className="py-2 px-4"></td>
                    <td className="py-2 px-4"></td>
                    <td className="py-2 px-4"></td>
                    <td className={`py-2 px-4 text-sm font-bold ${filteredProfit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{filteredProfit.toLocaleString('ru-RU')} ₸</td>
                  </tr>
                )}
              </tfoot>
            </table>

            {/* Desktop pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} из {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-30 transition-colors"
                  >
                    ←
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i;
                    } else if (safePage < 4) {
                      pageNum = i;
                    } else if (safePage > totalPages - 5) {
                      pageNum = totalPages - 7 + i;
                    } else {
                      pageNum = safePage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
                          pageNum === safePage
                            ? 'bg-emerald-500 text-white'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-30 transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
