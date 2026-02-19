'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Lock,
  Search,
  Store,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ArrowUpDown,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface StoreInfo {
  id: string;
  name: string;
  merchantId: string | null;
  ownerEmail: string;
  ownerName: string;
  createdAt: string;
  totalRevenue: number;
  totalOrders: number;
}

type SortField = 'revenue' | 'orders' | 'name' | 'date';

export default function SecretStoresPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authAttempts, setAuthAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('revenue');

  const MASTER_CODE = 'METRICON2024';
  const MAX_ATTEMPTS = 3;

  const handleAuth = () => {
    if (isLocked) return;
    if (secretCode === MASTER_CODE) {
      setIsAuthenticated(true);
      setAuthError('');
      setAuthAttempts(0);
    } else {
      const newAttempts = authAttempts + 1;
      setAuthAttempts(newAttempts);
      setAuthError(`Неверный код. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`);
      setSecretCode('');
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setAuthError('Доступ заблокирован. Обратитесь к супер-администратору.');
      }
    }
  };

  const loadStores = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/store-analytics?userId=${user.id}`);
      const json = await res.json();
      if (json.success && json.stores) {
        setStores(json.stores);
      }
    } catch (e) {
      console.error('Failed to load stores:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated) loadStores();
  }, [isAuthenticated, loadStores]);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B ₸`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₸`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K ₸`;
    return `${Math.round(amount)} ₸`;
  };

  const sortedStores = useMemo(() => {
    let result = stores.filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (s.name || '').toLowerCase().includes(q) ||
        s.ownerEmail.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        (s.merchantId || '').toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      switch (sortField) {
        case 'revenue': return b.totalRevenue - a.totalRevenue;
        case 'orders': return b.totalOrders - a.totalOrders;
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: return 0;
      }
    });

    return result;
  }, [stores, search, sortField]);

  // Totals
  const platformTotals = useMemo(() => {
    const revenue = stores.reduce((s, st) => s + st.totalRevenue, 0);
    const orders = stores.reduce((s, st) => s + st.totalOrders, 0);
    return { revenue, orders };
  }, [stores]);

  // Auth screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-xs">
          {isLocked ? (
            <div className="text-red-500 text-center text-sm">{authError}</div>
          ) : (
            <div className="space-y-3">
              <style>{`
                .secret-input {
                  -webkit-text-security: disc !important;
                  background-color: #1f2937 !important;
                  color: #ffffff !important;
                  caret-color: #ffffff !important;
                }
                .secret-input:-webkit-autofill,
                .secret-input:-webkit-autofill:hover,
                .secret-input:-webkit-autofill:focus,
                .secret-input:-webkit-autofill:active {
                  -webkit-box-shadow: 0 0 0 30px #1f2937 inset !important;
                  -webkit-text-fill-color: #ffffff !important;
                  background-color: #1f2937 !important;
                  transition: background-color 5000s ease-in-out 0s !important;
                }
              `}</style>
              <input
                type="text"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                placeholder=""
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                autoFocus
                className="secret-input w-full border border-gray-700 rounded-lg px-4 py-3 text-center focus:outline-none focus:border-gray-600 font-mono tracking-widest text-lg"
                maxLength={20}
              />
              {authError && (
                <p className="text-red-500 text-xs text-center">{authError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Магазины</h1>
            <p className="text-gray-500 text-sm">{stores.length} компаний</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Админ
        </button>
      </div>

      {/* Platform totals */}
      {!loading && stores.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-gray-400">Общий оборот</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatAmount(platformTotals.revenue)}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">Всего заказов</span>
            </div>
            <div className="text-2xl font-bold text-white">{platformTotals.orders.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по названию, email, merchant ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex gap-2">
          {([
            { field: 'revenue' as SortField, label: 'Оборот' },
            { field: 'orders' as SortField, label: 'Заказы' },
            { field: 'name' as SortField, label: 'Имя' },
            { field: 'date' as SortField, label: 'Дата' },
          ]).map((s) => (
            <button
              key={s.field}
              onClick={() => setSortField(s.field)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                sortField === s.field
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      )}

      {/* Store List */}
      {!loading && (
        <div className="space-y-3">
          {sortedStores.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              {stores.length === 0 ? 'Нет магазинов' : 'Ничего не найдено'}
            </div>
          ) : (
            sortedStores.map((store, idx) => (
              <button
                key={store.id}
                onClick={() => router.push(`/admin/x7k9m2p4q8r1/${store.id}`)}
                className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-xl p-4 sm:p-5 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    <span className={`text-sm font-bold ${idx < 3 ? 'text-red-400' : 'text-gray-600'}`}>
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium truncate">
                        {store.name || 'Без названия'}
                      </span>
                      {store.merchantId && (
                        <span className="text-xs text-gray-500 font-mono hidden sm:inline">
                          {store.merchantId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="truncate">{store.ownerName || store.ownerEmail}</span>
                      {store.ownerName && (
                        <span className="text-gray-600 hidden sm:inline">{store.ownerEmail}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-400">{formatAmount(store.totalRevenue)}</div>
                      <div className="text-xs text-gray-500">оборот</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{store.totalOrders.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">заказов</div>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="sm:hidden text-right shrink-0">
                    <div className="text-sm font-semibold text-emerald-400">{formatAmount(store.totalRevenue)}</div>
                    <div className="text-xs text-gray-500">{store.totalOrders} зак.</div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 hidden sm:block" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 text-gray-600 text-xs">
        <Lock className="w-3 h-3" />
        <span>Данные защищены • Доступ ограничен</span>
      </div>
    </div>
  );
}
