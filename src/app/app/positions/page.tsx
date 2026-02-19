'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Target,
  RefreshCw,
  Loader2,
  Plus,
  X,
  Clock,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface PositionQuery {
  keyword: string;
  isCustom: boolean;
  keywordId: string | null;
  positionOrganic: number | null;
  positionAd: number | null;
  totalResults: number | null;
  checkedAt: string | null;
}

interface ProductPosition {
  id: string;
  name: string;
  kaspiId: string | null;
  queries: PositionQuery[];
}

export default function PositionsPage() {
  const { user, loading: userLoading } = useUser();

  const [products, setProducts] = useState<ProductPosition[]>([]);
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Check states
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingProduct, setCheckingProduct] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Add keyword
  const [addKeywordFor, setAddKeywordFor] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [addingKeyword, setAddingKeyword] = useState(false);

  const loadPositions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/positions?userId=${user.id}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.products || []);
        setStoreName(json.storeName || '');
      }
    } catch (e) {
      console.error('Failed to load positions:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!userLoading && user?.id) loadPositions();
  }, [userLoading, user?.id, loadPositions]);

  // Check all products
  const handleCheckAll = async () => {
    if (!user?.id || checkingAll) return;
    setCheckingAll(true);
    setDebugLogs([]);
    setShowLogs(true);
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, checkAll: true }),
      });
      const json = await res.json();
      if (json.logs) setDebugLogs(json.logs);
      await loadPositions();
    } catch (e) {
      console.error('Check all error:', e);
      setDebugLogs(prev => [...prev, `[UI] Error: ${e}`]);
    } finally {
      setCheckingAll(false);
    }
  };

  // Check single product
  const handleCheckProduct = async (productId: string) => {
    if (!user?.id || checkingProduct) return;
    setCheckingProduct(productId);
    setDebugLogs([]);
    setShowLogs(true);
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId }),
      });
      const json = await res.json();
      if (json.logs) setDebugLogs(json.logs);
      await loadPositions();
    } catch (e) {
      console.error('Check product error:', e);
      setDebugLogs(prev => [...prev, `[UI] Error: ${e}`]);
    } finally {
      setCheckingProduct(null);
    }
  };

  // Add keyword
  const handleAddKeyword = async (productId: string) => {
    if (!user?.id || !newKeyword.trim() || addingKeyword) return;
    setAddingKeyword(true);
    try {
      const res = await fetch('/api/positions/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId, keyword: newKeyword.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNewKeyword('');
        setAddKeywordFor(null);
        await loadPositions();
      } else {
        alert(json.message || 'Ошибка');
      }
    } catch (e) {
      console.error('Add keyword error:', e);
    } finally {
      setAddingKeyword(false);
    }
  };

  // Delete keyword
  const handleDeleteKeyword = async (keywordId: string) => {
    if (!user?.id) return;
    try {
      await fetch(`/api/positions/keywords?userId=${user.id}&keywordId=${keywordId}`, {
        method: 'DELETE',
      });
      await loadPositions();
    } catch (e) {
      console.error('Delete keyword error:', e);
    }
  };

  // Filter
  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.queries.some(qr => qr.keyword.toLowerCase().includes(q))
    );
  }, [products, search]);

  // Stats
  const stats = useMemo(() => {
    let totalChecked = 0;
    let inTop3 = 0;
    let inTop10 = 0;
    let notFound = 0;
    for (const p of products) {
      for (const q of p.queries) {
        if (q.checkedAt) {
          totalChecked++;
          const pos = q.positionOrganic;
          if (pos === null) {
            notFound++;
          } else if (pos <= 3) {
            inTop3++;
          } else if (pos <= 10) {
            inTop10++;
          }
        }
      }
    }
    return { totalChecked, inTop3, inTop10, notFound };
  }, [products]);

  // Position badge
  const PositionBadge = ({ position, label }: { position: number | null; label: string }) => {
    if (position === null) {
      return (
        <div className="text-center">
          {label && <div className="text-xs text-gray-500 mb-0.5">{label}</div>}
          <span className="text-gray-600 text-sm">—</span>
        </div>
      );
    }
    let color = 'bg-red-500/20 text-red-400';
    if (position <= 3) color = 'bg-emerald-500/20 text-emerald-400';
    else if (position <= 10) color = 'bg-yellow-500/20 text-yellow-400';
    else if (position <= 20) color = 'bg-orange-500/20 text-orange-400';

    return (
      <div className="text-center">
        {label && <div className="text-xs text-gray-500 mb-0.5">{label}</div>}
        <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-md text-sm font-semibold ${color}`}>
          #{position}
        </span>
      </div>
    );
  };

  // Time ago
  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Не проверено';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Только что';
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}ч назад`;
    const days = Math.floor(hours / 24);
    return `${days}д назад`;
  };

  if (userLoading || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-gray-800 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse">
              <div className="h-3 w-16 bg-gray-700 rounded mb-2" />
              <div className="h-6 w-10 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
        <div className="h-12 bg-gray-800 rounded-xl animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse">
            <div className="h-5 w-3/4 bg-gray-700 rounded mb-3" />
            <div className="h-4 w-1/2 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Позиции в поиске</h1>
          <p className="text-gray-400 text-sm mt-1">
            {products.length} товаров {storeName && `• ${storeName}`}
          </p>
        </div>
        <button
          onClick={handleCheckAll}
          disabled={checkingAll || !!checkingProduct}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
        >
          {checkingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Проверяем...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Проверить все
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      {stats.totalChecked > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Проверено</div>
            <div className="text-xl font-bold text-white">{stats.totalChecked}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Топ 3</div>
            <div className="text-xl font-bold text-emerald-400">{stats.inTop3}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Топ 10</div>
            <div className="text-xl font-bold text-yellow-400">{stats.inTop10}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Не найдено</div>
            <div className="text-xl font-bold text-red-400">{stats.notFound}</div>
          </div>
        </div>
      )}

      {/* Debug logs */}
      {showLogs && debugLogs.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <span className="text-xs text-gray-400 font-mono">Debug Logs ({debugLogs.length})</span>
            <button
              onClick={() => setShowLogs(false)}
              className="text-gray-500 hover:text-white text-xs"
            >
              Скрыть
            </button>
          </div>
          <div className="p-3 max-h-64 overflow-y-auto">
            {debugLogs.map((line, i) => (
              <div key={i} className="text-xs font-mono text-gray-400 py-0.5 break-all">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Поиск по товару или ключевому слову..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Products */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {products.length === 0
              ? 'Нет товаров для проверки позиций'
              : 'Ничего не найдено'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
            >
              {/* Product header */}
              <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-sm truncate">{product.name}</h3>
                  {product.kaspiId && (
                    <span className="text-xs text-gray-500 font-mono">{product.kaspiId}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => setAddKeywordFor(addKeywordFor === product.id ? null : product.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Добавить запрос"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCheckProduct(product.id)}
                    disabled={checkingAll || !!checkingProduct}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {checkingProduct === product.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Проверить
                  </button>
                </div>
              </div>

              {/* Add keyword input */}
              {addKeywordFor === product.id && (
                <div className="px-4 pb-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Введите ключевое слово..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(product.id)}
                      autoFocus
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleAddKeyword(product.id)}
                      disabled={addingKeyword || !newKeyword.trim()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {addingKeyword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Добавить'}
                    </button>
                    <button
                      onClick={() => { setAddKeywordFor(null); setNewKeyword(''); }}
                      className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Queries table — desktop */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-t border-gray-700">
                      <th className="text-left text-xs text-gray-500 font-normal px-4 py-2">Запрос</th>
                      <th className="text-center text-xs text-gray-500 font-normal px-2 py-2 w-24">Реклама</th>
                      <th className="text-center text-xs text-gray-500 font-normal px-2 py-2 w-24">Органика</th>
                      <th className="text-right text-xs text-gray-500 font-normal px-4 py-2 w-32">Обновлено</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.queries.map((q, idx) => (
                      <tr key={idx} className="border-t border-gray-700/50 hover:bg-gray-750/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-300 truncate max-w-[300px]">{q.keyword}</span>
                            {q.isCustom && (
                              <span className="shrink-0 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded font-medium">
                                свой
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <PositionBadge position={q.positionAd} label="" />
                        </td>
                        <td className="px-2 py-2.5">
                          <PositionBadge position={q.positionOrganic} label="" />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs text-gray-500 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(q.checkedAt)}
                          </span>
                        </td>
                        <td className="pr-3 py-2.5">
                          {q.isCustom && q.keywordId && (
                            <button
                              onClick={() => handleDeleteKeyword(q.keywordId!)}
                              className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors"
                              title="Удалить запрос"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Queries — mobile cards */}
              <div className="sm:hidden divide-y divide-gray-700/50">
                {product.queries.map((q, idx) => (
                  <div key={idx} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-gray-300 truncate">{q.keyword}</span>
                        {q.isCustom && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded font-medium">
                            свой
                          </span>
                        )}
                      </div>
                      {q.isCustom && q.keywordId && (
                        <button
                          onClick={() => handleDeleteKeyword(q.keywordId!)}
                          className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <PositionBadge position={q.positionAd} label="Реклама" />
                      <PositionBadge position={q.positionOrganic} label="Органика" />
                      <div className="flex-1 text-right">
                        <span className="text-xs text-gray-500 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(q.checkedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
