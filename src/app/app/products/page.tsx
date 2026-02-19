'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, RefreshCw, Check, X, ChevronUp, ChevronDown,
  Package, AlertCircle, Loader2, Clock, Edit3, Save, HelpCircle,
  BoxSelect, AlertTriangle, ShoppingBag,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { getStale, setCache } from '@/lib/cache';
import type { KaspiProduct } from '@/lib/kaspi/api-client';
import ProductsSkeleton from './components/ProductsSkeleton';
import LoginForm from './components/LoginForm';
import EditModal from './components/EditModal';

type SortField = 'name' | 'price' | 'stock' | 'preorder';
type SortDir = 'asc' | 'desc';
type FilterTab = 'all' | 'preorder' | 'notSpecified' | 'lowStock';

interface CabinetSession {
  connected: boolean;
  merchantId?: string;
  username?: string;
}

export default function ProductsPage() {
  const { user, loading: userLoading } = useUser();

  // Session
  const [session, setSession] = useState<CabinetSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Products — with cache
  const CACHE_KEY = `products_${user?.id || ''}`;
  const cached = user?.id ? getStale<{ products: KaspiProduct[]; stats: { inStock: number; notSpecified: number; lowStock: number } }>(CACHE_KEY) : null;
  const [allProducts, setAllProducts] = useState<KaspiProduct[]>(cached?.data.products || []);
  const [stats, setStats] = useState<{ inStock: number; notSpecified: number; lowStock: number }>(cached?.data.stats || { inStock: 0, notSpecified: 0, lowStock: 0 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const limit = 20;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showRefreshHelp, setShowRefreshHelp] = useState(false);
  const [lowStockThreshold] = useState(5);

  // Inline edit
  const [editingCell, setEditingCell] = useState<{ offerId: string; field: 'price' | 'stock' | 'preorder' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Preorder changes
  const [preorderChanges, setPreorderChanges] = useState<Record<string, number>>({});
  const [savingPreorders, setSavingPreorders] = useState(false);
  const [preorderSaved, setPreorderSaved] = useState(false);

  // Login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // === Effects ===

  useEffect(() => {
    if (userLoading) return;
    if (!user?.id) { setSessionLoading(false); return; }
    checkSession();
  }, [user?.id, userLoading]);

  useEffect(() => {
    if (session?.connected && user?.id) loadProducts();
  }, [session?.connected, user?.id]);

  // === API calls ===

  const checkSession = async () => {
    if (!user?.id) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/kaspi/cabinet/session?userId=${user.id}`);
      const data = await res.json();
      setSession({ connected: data.connected || false, merchantId: data.merchantId, username: data.username });
    } catch {
      setSession({ connected: false });
    } finally {
      setSessionLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!user?.id) return;
    const hasCached = allProducts.length > 0;
    if (!hasCached) setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`/api/kaspi/cabinet/products?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        const products = data.products || [];
        const newStats = data.stats || stats;
        setAllProducts(products);
        setStats(newStats);
        setCache(`products_${user.id}`, { products, stats: newStats });
      } else if (data.needLogin) {
        setSession({ connected: false });
      } else {
        if (!hasCached) setLoadError(data.error || 'Не удалось загрузить товары');
      }
    } catch (err) {
      console.error('Load products error:', err);
      if (!hasCached) setLoadError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  // === Inline editing ===

  const startEdit = (offerId: string, field: 'price' | 'stock' | 'preorder', currentValue: number | null) => {
    setEditingCell({ offerId, field });
    setEditValue(currentValue?.toString() || '');
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(''); };

  const saveEdit = useCallback(async () => {
    if (!editingCell || !user?.id) return;
    setSaving(true);
    const value = editValue.trim() === '' ? null : parseFloat(editValue);

    try {
      const product = allProducts.find(p => p.offerId === editingCell.offerId);
      if (!product) throw new Error('Товар не найден');

      const availabilities = (product.availabilities || []).map(a => {
        let preOrder = a.preorderPeriod ?? 0;
        if (editingCell.field === 'preorder') {
          preOrder = value !== null && value > 0 ? Math.min(Math.round(value), 30) : 0;
        }
        return { available: a.available ? 'yes' : 'no', storeId: a.storeId, preOrder };
      });

      let cityPrices = product.cityPrices?.map(cp => ({ cityId: cp.cityId, value: cp.value }));
      if (editingCell.field === 'price' && value !== null && cityPrices && cityPrices.length > 0) {
        cityPrices = cityPrices.map(cp => ({ ...cp, value: Math.round(value) }));
      }

      const res = await fetch('/api/kaspi/cabinet/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sku: product.sku || product.masterSku, model: product.name, availabilities, cityPrices }),
      });
      const data = await res.json();

      if (data.success) {
        setAllProducts(prev => prev.map(p => {
          if (p.offerId !== editingCell.offerId) return p;
          const updated = { ...p };
          if (editingCell.field === 'price' && value !== null) updated.price = value;
          if (editingCell.field === 'stock' && value !== null) updated.stock = Math.round(value);
          if (editingCell.field === 'preorder') updated.preorder = value !== null ? Math.round(value) : null;
          return updated;
        }));
        const label = editingCell.field === 'price' ? 'Цена' : editingCell.field === 'preorder' ? 'Предзаказ' : 'Остаток';
        setToast({ message: `${label} обновлён. Изменения на Kaspi в течение минуты`, type: 'success' });
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast({ message: data.error || 'Не удалось сохранить', type: 'error' });
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err) {
      console.error('Save error:', err);
      setToast({ message: 'Ошибка соединения', type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, editValue, user?.id, allProducts]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  // === Preorder ===

  const setPreorder = (sku: string, days: number | null) => {
    setPreorderChanges(prev => {
      if (days === null || days <= 0) { const next = { ...prev }; delete next[sku]; return next; }
      return { ...prev, [sku]: Math.min(days, 30) };
    });
    setAllProducts(prev => prev.map(p =>
      p.sku !== sku ? p : { ...p, preorder: days !== null && days > 0 ? Math.min(days, 30) : null }
    ));
  };

  const savePreorderOverrides = async () => {
    if (!user?.id || Object.keys(preorderChanges).length === 0) return;
    setSavingPreorders(true);
    try {
      const products = Object.entries(preorderChanges).map(([sku, days]) => {
        const product = allProducts.find(p => p.sku === sku);
        if (!product) return null;
        return {
          sku: product.sku || product.masterSku || sku,
          model: product.name,
          availabilities: (product.availabilities || []).map(a => ({
            available: a.available ? 'yes' : 'no', storeId: a.storeId,
            preOrder: days > 0 ? Math.min(days, 30) : 0,
          })),
          cityPrices: product.cityPrices?.map(cp => ({ cityId: cp.cityId, value: cp.value })),
        };
      }).filter(Boolean);

      if (products.length === 0) { alert('Не найдены товары для обновления'); return; }

      const res = await fetch('/api/kaspi/cabinet/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, products }),
      });
      const data = await res.json();

      if (data.success) {
        setPreorderSaved(true);
        setTimeout(() => setPreorderSaved(false), 3000);
        setPreorderChanges({});
      } else {
        alert(`Ошибка Kaspi: ${data.error || 'Не удалось обновить'}`);
      }
    } catch (err) {
      console.error('Save preorder error:', err);
      alert('Ошибка сохранения');
    } finally {
      setSavingPreorders(false);
    }
  };

  const hasPreorderChanges = Object.keys(preorderChanges).length > 0;

  // === Sorting & Filtering ===

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />;
  };

  // Dynamic counts
  const preorderCount = allProducts.filter(p => p.preorder != null && p.preorder > 0).length;
  const notSpecifiedCount = allProducts.filter(p => p.stockSpecified === false).length;
  const lowStockCount = allProducts.filter(p => p.stock > 0 && p.stock < lowStockThreshold && p.stockSpecified !== false).length;

  const filteredSorted = allProducts
    .filter(p => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.sku.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterTab === 'preorder') return p.preorder != null && p.preorder > 0;
      if (filterTab === 'notSpecified') return p.stockSpecified === false;
      if (filterTab === 'lowStock') return p.stock > 0 && p.stock < lowStockThreshold && p.stockSpecified !== false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'price') return (a.price - b.price) * dir;
      if (sortBy === 'stock') return (a.stock - b.stock) * dir;
      if (sortBy === 'preorder') return ((a.preorder || 0) - (b.preorder || 0)) * dir;
      return 0;
    });

  const total = filteredSorted.length;
  const totalPages = Math.ceil(total / limit);
  const filteredProducts = filteredSorted.slice(page * limit, (page + 1) * limit);

  // Pagination helpers — show max 5 page buttons
  const paginationRange = (): number[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: 5 }, (_, i) => start + i);
  };

  // === Early returns ===

  if (userLoading || sessionLoading) return <ProductsSkeleton />;

  if (!session?.connected) {
    return (
      <LoginForm
        userId={user?.id || ''}
        onSuccess={({ merchantId, username }) => {
          setSession({ connected: true, merchantId, username });
        }}
      />
    );
  }

  // === RENDER ===
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
        <EditModal
          field={editingCell.field}
          value={editValue}
          onChange={setEditValue}
          onSave={saveEdit}
          onCancel={cancelEdit}
          saving={saving}
        />
      )}

      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Товары</h1>
        <div className="flex gap-2 items-center">
          {hasPreorderChanges && (
            <button
              onClick={savePreorderOverrides}
              disabled={savingPreorders}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {savingPreorders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Сохранить ({Object.keys(preorderChanges).length})
            </button>
          )}
          {preorderSaved && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
              <Check className="w-4 h-4" /> Сохранено
            </span>
          )}
          <div className="relative flex items-center">
            <button
              onClick={loadProducts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Обновить</span>
            </button>
            <button onClick={() => setShowRefreshHelp(p => !p)} className="ml-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </button>
            {showRefreshHelp && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRefreshHelp(false)} />
                <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg z-50 whitespace-nowrap">
                  Загрузить актуальный список товаров из Kaspi
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <button
          onClick={() => { setFilterTab('all'); setPage(0); }}
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-left transition-all cursor-pointer border-2 ${
            filterTab === 'all' ? 'border-gray-900 dark:border-gray-100' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Все</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{allProducts.length}</p>
        </button>

        <button
          onClick={() => { setFilterTab('preorder'); setPage(0); }}
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-left transition-all cursor-pointer border-2 ${
            filterTab === 'preorder' ? 'border-blue-500' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Предзаказ</span>
          </div>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{preorderCount}</p>
        </button>

        <button
          onClick={() => { setFilterTab('notSpecified'); setPage(0); }}
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-left transition-all cursor-pointer border-2 ${
            filterTab === 'notSpecified' ? 'border-amber-500' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Не указан</span>
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{notSpecifiedCount}</p>
        </button>

        <button
          onClick={() => { setFilterTab('lowStock'); setPage(0); }}
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm text-left transition-all cursor-pointer border-2 ${
            filterTab === 'lowStock' ? 'border-red-500' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <BoxSelect className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Мало (&lt;{lowStockThreshold})</span>
          </div>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{lowStockCount}</p>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm mb-4">
        <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            placeholder="Поиск по названию или SKU..."
            className="flex-1 bg-transparent text-sm focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setPage(0); }} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {loadError && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Не удалось загрузить товары</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{loadError}</p>
              <button onClick={loadProducts} className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700 transition-colors cursor-pointer">
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && allProducts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Загрузка товаров...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && allProducts.length > 0 && filteredProducts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm text-center">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Товары не найдены</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {searchTerm ? 'Попробуйте изменить поисковый запрос' : 'Нет товаров по выбранному фильтру'}
          </p>
        </div>
      )}

      {/* Products */}
      {filteredProducts.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {filteredProducts.map((product) => (
              <div key={product.offerId || product.sku} className="bg-white dark:bg-gray-800 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{product.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{product.sku}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => startEdit(product.offerId || '', 'price', product.price)}
                        className="flex items-center gap-1 text-sm font-semibold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-gray-900 dark:text-white"
                      >
                        {product.price.toLocaleString('ru-RU')} &#8376;
                        <Edit3 className="w-3 h-3 text-gray-400" />
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {product.stockSpecified === false ? (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-medium rounded">Не указан</span>
                        ) : (
                          <>{product.stock} шт</>
                        )}
                      </span>
                      {product.preorder != null && product.preorder > 0 && (
                        <button
                          onClick={() => startEdit(product.offerId || '', 'preorder', product.preorder ?? 0)}
                          className={`flex items-center gap-0.5 text-[11px] cursor-pointer ${
                            preorderChanges[product.sku] ? 'text-amber-600' : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          <Clock className="w-3 h-3" /> {product.preorder}д.
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {[
                      { field: 'name' as SortField, label: 'Товар' },
                      { field: 'price' as SortField, label: 'Цена' },
                      { field: 'stock' as SortField, label: 'Остаток' },
                      { field: 'preorder' as SortField, label: 'Предзаказ' },
                    ].map(col => (
                      <th
                        key={col.field}
                        onClick={() => handleSort(col.field)}
                        className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                      >
                        {col.label}<SortIcon field={col.field} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.offerId || product.sku}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[300px] text-gray-900 dark:text-white">{product.name}</p>
                            <p className="text-xs text-gray-400">{product.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4">
                        {editingCell !== null && editingCell.offerId === product.offerId && editingCell.field === 'price' ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="w-28 px-2 py-1 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              min="0"
                            />
                            <span className="text-xs text-gray-400">&#8376;</span>
                            <button onClick={saveEdit} disabled={saving} className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(product.offerId || '', 'price', product.price)} className="group flex items-center gap-1 cursor-pointer">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {product.price.toLocaleString('ru-RU')} &#8376;
                            </span>
                            <Edit3 className="w-3 h-3 text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4">
                        {product.stockSpecified === false ? (
                          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-lg">
                            Не указан
                          </span>
                        ) : (
                          <span className={`text-sm font-medium ${
                            product.stock === 0
                              ? 'text-gray-400 dark:text-gray-500'
                              : product.stock < lowStockThreshold
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-900 dark:text-white'
                          }`}>
                            {product.stock} шт
                          </span>
                        )}
                      </td>

                      {/* Preorder */}
                      <td className="py-3 px-4">
                        {editingCell !== null && editingCell.offerId === product.offerId && editingCell.field === 'preorder' ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="w-16 px-2 py-1 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              min="0" max="30" placeholder="0-30"
                            />
                            <span className="text-xs text-gray-400">д.</span>
                            <button onClick={saveEdit} className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(product.offerId || '', 'preorder', product.preorder ?? null)}
                            className={`group flex items-center gap-1 cursor-pointer ${preorderChanges[product.sku] ? 'text-amber-600 dark:text-amber-400' : ''}`}
                          >
                            {product.preorder && product.preorder > 0 ? (
                              <span className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                {product.preorder} д.
                                {preorderChanges[product.sku] && (
                                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 rounded">изм.</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                            )}
                            <Edit3 className="w-3 h-3 text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {page * limit + 1}–{Math.min((page + 1) * limit, total)} из {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    page === 0
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
                  }`}
                >
                  ←
                </button>
                {paginationRange().map(i => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      i === page
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    page >= totalPages - 1
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
                  }`}
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
