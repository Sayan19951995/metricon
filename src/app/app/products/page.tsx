'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  RefreshCw,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Package,
  AlertCircle,
  LogIn,
  Loader2,
  Clock,
  Edit3,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import type { KaspiProduct, KaspiAvailability } from '@/lib/kaspi/api-client';

type SortField = 'name' | 'price' | 'stock' | 'preorder';
type SortDir = 'asc' | 'desc';

interface CabinetSession {
  connected: boolean;
  merchantId?: string;
  username?: string;
}

export default function ProductsPage() {
  const { user, loading: userLoading } = useUser();

  // Состояние сессии кабинета
  const [session, setSession] = useState<CabinetSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Товары (все загруженные)
  const [allProducts, setAllProducts] = useState<KaspiProduct[]>([]);
  const [stats, setStats] = useState<{ inStock: number; notSpecified: number; lowStock: number }>({ inStock: 0, notSpecified: 0, lowStock: 0 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  // Фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'inStock' | 'outOfStock'>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Inline edit
  const [editingCell, setEditingCell] = useState<{ offerId: string; field: 'price' | 'stock' | 'preorder' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Ошибка загрузки товаров
  const [loadError, setLoadError] = useState('');

  // Логин
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Проверка сессии при загрузке
  useEffect(() => {
    if (userLoading) return;
    if (!user?.id) {
      setSessionLoading(false);
      return;
    }
    checkSession();
  }, [user?.id, userLoading]);

  // Загрузка товаров когда сессия активна
  useEffect(() => {
    if (session?.connected && user?.id) {
      loadProducts();
    }
  }, [session?.connected, user?.id]);

  const checkSession = async () => {
    if (!user?.id) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/kaspi/cabinet/session?userId=${user.id}`);
      const data = await res.json();
      setSession({
        connected: data.connected || false,
        merchantId: data.merchantId,
        username: data.username,
      });
    } catch {
      setSession({ connected: false });
    } finally {
      setSessionLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`/api/kaspi/cabinet/products?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setAllProducts(data.products || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else if (data.needLogin) {
        setSession({ connected: false });
      } else {
        setLoadError(data.error || 'Не удалось загрузить товары');
      }
    } catch (err) {
      console.error('Load products error:', err);
      setLoadError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!user?.id) return;
    setLoginLoading(true);
    setLoginError('');

    try {
      if (!loginUsername.trim() || !loginPassword.trim()) {
        setLoginError('Введите логин и пароль');
        setLoginLoading(false);
        return;
      }

      const res = await fetch('/api/kaspi/cabinet/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: loginUsername.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSession({
          connected: true,
          merchantId: data.merchantId,
          username: loginUsername || undefined,
        });
        setLoginError('');
      } else {
        setLoginError(data.error || 'Не удалось подключиться');
      }
    } catch {
      setLoginError('Ошибка подключения');
    } finally {
      setLoginLoading(false);
    }
  };

  // Inline editing
  const startEdit = (offerId: string, field: 'price' | 'stock' | 'preorder', currentValue: number | null) => {
    setEditingCell({ offerId, field });
    setEditValue(currentValue?.toString() || '');
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = useCallback(async () => {
    if (!editingCell || !user?.id) return;
    setSaving(true);

    const value = editValue.trim() === '' ? null : parseFloat(editValue);

    try {
      const body: Record<string, unknown> = {
        userId: user.id,
        offerId: editingCell.offerId,
      };

      if (editingCell.field === 'price') body.price = value;
      if (editingCell.field === 'stock') body.stock = value !== null ? Math.round(value) : 0;
      if (editingCell.field === 'preorder') body.preorder = value !== null ? Math.round(value) : null;

      const res = await fetch('/api/kaspi/cabinet/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        // Обновляем локально
        setAllProducts(prev => prev.map(p => {
          if (p.offerId !== editingCell.offerId) return p;
          const updated = { ...p };
          if (editingCell.field === 'price' && value !== null) updated.price = value;
          if (editingCell.field === 'stock' && value !== null) updated.stock = Math.round(value);
          if (editingCell.field === 'preorder') updated.preorder = value !== null ? Math.round(value) : null;
          return updated;
        }));
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, editValue, user?.id]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  // Сортировка
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />;
  };

  // Фильтрация и сортировка по ВСЕМ товарам
  const filteredSorted = allProducts
    .filter(p => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.sku.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterStock === 'inStock' && p.stock <= 0) return false;
      if (filterStock === 'outOfStock' && p.stock > 0) return false;
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

  // === РЕНДЕР ===

  // Скелетон товаров
  const ProductsSkeleton = () => (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-52 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm mb-4 flex gap-3">
        <div className="flex-1 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-9 w-28 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" style={{ width: `${80 + i * 20}px` }} />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          {['w-32', 'w-20', 'w-16', 'w-16', 'w-20', 'w-16'].map((w, i) => (
            <div key={i} className={`h-3 ${w} bg-gray-200 dark:bg-gray-600 rounded animate-pulse`} />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(8)].map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-gray-50 dark:border-gray-700/50 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-3 w-14 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-2.5 w-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-16 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-12 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="h-4 w-32 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );

  // Загрузка сессии
  if (userLoading || sessionLoading) {
    return <ProductsSkeleton />;
  }

  // Кабинет не подключен — форма входа
  if (!session?.connected) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Товары</h1>
          <p className="text-gray-500 text-sm">Управление товарами на Kaspi</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Подключите Kaspi кабинет</h2>
              <p className="text-gray-500 text-sm">
                Для управления товарами, ценами и предзаказами необходимо подключить
                ваш Kaspi Merchant Cabinet
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Логин (телефон или email)
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="+7 (777) 123-45-67"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Пароль
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Пароль от Kaspi кабинета"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>

              {loginError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{loginError}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-[#f14635] to-[#ff6b5a] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Подключение...
                  </span>
                ) : (
                  'Подключить кабинет'
                )}
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    );
  }

  // === Товары загружены ===
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Товары</h1>
          <p className="text-gray-500 text-sm">
            {session.username ? `${session.username} — ` : ''}
            {total} товаров в кабинете Kaspi
          </p>
        </div>
        <button
          onClick={loadProducts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Всего</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">В наличии</p>
          <p className="text-2xl font-bold text-emerald-600">
            {stats.inStock}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Осталось &lt; 5</p>
          <p className="text-2xl font-bold text-amber-500">
            {stats.lowStock}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Не указаны остатки</p>
          <p className="text-2xl font-bold text-gray-400">
            {stats.notSpecified}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                placeholder="Поиск по названию или SKU..."
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {(['all', 'inStock', 'outOfStock'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilterStock(f); setPage(0); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterStock === f
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'Все' : f === 'inStock' ? 'В наличии' : 'Нет в наличии'}
              </button>
            ))}
          </div>
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
              <button
                onClick={loadProducts}
                className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700 transition-colors cursor-pointer"
              >
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
          <p className="text-gray-500">Загрузка товаров...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && filteredProducts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Товары не найдены</h3>
          <p className="text-gray-500 text-sm">
            {searchTerm ? 'Попробуйте изменить поисковый запрос' : 'В кабинете пока нет товаров'}
          </p>
        </div>
      )}

      {/* Products Table */}
      {filteredProducts.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.offerId || product.sku}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{product.sku} {product.category && `/ ${product.category}`}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-semibold">{product.price.toLocaleString('ru-RU')} &#8376;</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.stock} шт
                      </span>
                      {product.preorder && product.preorder > 0 && (
                        <span className="flex items-center gap-1 text-xs text-purple-600">
                          <Clock className="w-3 h-3" />
                          {product.preorder} д.
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(product.offerId || '', 'price', product.price)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Availabilities */}
                {product.availabilities && product.availabilities.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap gap-2">
                      {product.availabilities.map((a: KaspiAvailability, i: number) => (
                        <span key={i} className="text-xs bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                          {a.storeName || a.cityName || `#${i+1}`}: {a.stockCount} шт
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      Товар<SortIcon field="name" />
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                      Город / Склад
                    </th>
                    <th
                      onClick={() => handleSort('stock')}
                      className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      Остаток<SortIcon field="stock" />
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                      Наличие
                    </th>
                    <th
                      onClick={() => handleSort('price')}
                      className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      Цена<SortIcon field="price" />
                    </th>
                    <th
                      onClick={() => handleSort('preorder')}
                      className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
                    >
                      Предзаказ<SortIcon field="preorder" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <motion.tr
                      key={product.offerId || product.sku}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      {/* Товар */}
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
                            <p className="text-sm font-medium truncate max-w-[250px]">{product.name}</p>
                            <p className="text-xs text-gray-400">{product.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Город/Склад */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          {product.availabilities && product.availabilities.length > 0 ? (
                            product.availabilities.slice(0, 3).map((a: KaspiAvailability, i: number) => (
                              <span key={i} className="text-xs text-gray-500 truncate max-w-[150px]">
                                {a.storeName || a.cityName || `Точка ${i+1}`}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {product.availabilities && product.availabilities.length > 3 && (
                            <span className="text-xs text-gray-400">+{product.availabilities.length - 3} ещё</span>
                          )}
                        </div>
                      </td>

                      {/* Остаток */}
                      <td className="py-3 px-4">
                        {editingCell !== null && editingCell.offerId === product.offerId && editingCell.field === 'stock' ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="w-20 px-2 py-1 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700"
                              min="0"
                            />
                            <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded cursor-pointer">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(product.offerId || '', 'stock', product.stock)}
                            className="group flex items-center gap-1 cursor-pointer"
                          >
                            <span className={`text-sm font-medium ${
                              product.stock > 10 ? 'text-emerald-600' :
                              product.stock > 0 ? 'text-amber-600' :
                              product.stockSpecified === false ? 'text-gray-400' :
                              'text-red-500'
                            }`}>
                              {product.stockSpecified === false ? '—' : `${product.stock} шт`}
                            </span>
                            <Edit3 className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* Наличие */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 0 || product.stockSpecified === false
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {product.stock > 0 || product.stockSpecified === false ? 'В наличии' : 'Нет'}
                        </span>
                      </td>

                      {/* Цена */}
                      <td className="py-3 px-4">
                        {editingCell !== null && editingCell.offerId === product.offerId && editingCell.field === 'price' ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="w-28 px-2 py-1 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700"
                              min="0"
                            />
                            <span className="text-xs text-gray-400">&#8376;</span>
                            <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded cursor-pointer">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(product.offerId || '', 'price', product.price)}
                            className="group flex items-center gap-1 cursor-pointer"
                          >
                            <span className="text-sm font-semibold">
                              {product.price.toLocaleString('ru-RU')} &#8376;
                            </span>
                            <Edit3 className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* Предзаказ */}
                      <td className="py-3 px-4">
                        {editingCell !== null && editingCell.offerId === product.offerId && editingCell.field === 'preorder' ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              placeholder="0"
                              className="w-16 px-2 py-1 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-700"
                              min="0"
                            />
                            <span className="text-xs text-gray-400">д.</span>
                            <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded cursor-pointer">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(product.offerId || '', 'preorder', product.preorder ?? null)}
                            className="group flex items-center gap-1 cursor-pointer"
                          >
                            {product.preorder && product.preorder > 0 ? (
                              <span className="flex items-center gap-1 text-sm text-purple-600 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {product.preorder} д.
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                            <Edit3 className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Страница {page + 1} из {totalPages} ({total} товаров)
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    page === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                  }`}
                >
                  Назад
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      i === page
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                  }`}
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
