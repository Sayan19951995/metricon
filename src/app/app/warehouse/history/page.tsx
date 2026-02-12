'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Package, ArrowLeft, RefreshCw, Loader2,
  CheckCircle, XCircle, Truck, ChevronDown, Plus, X,
  Calendar, Trash2,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase/client';

interface DBProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
}

interface RestockItem {
  type: 'existing' | 'draft';
  name: string;
  sku?: string;
  product_id?: string;
  quantity: number;
  price_per_unit: number;
  total: number;
}

interface RestockOrder {
  id: string;
  store_id: string | null;
  supplier: string;
  status: string;
  order_date: string | null;
  expected_date: string | null;
  items: RestockItem[];
  total_amount: number;
  delivery_cost: number;
  notes: string | null;
  created_at: string | null;
}

type StatusFilter = 'all' | 'in_transit' | 'completed' | 'cancelled';

export default function WarehouseHistoryPage() {
  const { store, loading: userLoading } = useUser();

  const [orders, setOrders] = useState<RestockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Products from DB
  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  interface FormItem {
    type: 'existing' | 'draft';
    product_id?: string;
    sku?: string;
    name: string;
    quantity: number;
    price_per_unit: number;
    searchQuery: string;
    showDropdown: boolean;
  }

  const emptyItem: FormItem = { type: 'draft', name: '', quantity: 1, price_per_unit: 0, searchQuery: '', showDropdown: false };

  const [form, setForm] = useState({
    supplier: '',
    expected_date: '',
    notes: '',
    delivery_cost: 0,
    items: [{ ...emptyItem }] as FormItem[],
  });

  // Accept modal
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptDeliveryCost, setAcceptDeliveryCost] = useState(0);

  const loadData = useCallback(async (showRefresh = false) => {
    if (!store?.id) return;
    if (orders.length === 0) setLoading(true);
    if (showRefresh) setRefreshing(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('restock_orders')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const parsed: RestockOrder[] = (data || []).map(o => ({
        ...o,
        items: Array.isArray(o.items) ? o.items as unknown as RestockItem[] : [],
      }));

      setOrders(parsed);
    } catch (err: any) {
      console.error('Restock load error:', err);
      setError(err?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [store?.id]);

  useEffect(() => {
    if (store?.id) loadData();
  }, [store?.id]);

  // Load products for autocomplete
  const loadProducts = useCallback(async () => {
    if (!store?.id) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, price')
      .eq('store_id', store.id)
      .not('name', 'eq', '')
      .order('name');
    if (data) setDbProducts(data as DBProduct[]);
  }, [store?.id]);

  const openModal = () => {
    loadProducts();
    setForm({ supplier: '', expected_date: '', notes: '', delivery_cost: 0, items: [{ ...emptyItem }] });
    setShowModal(true);
  };

  // --- CRUD ---

  const createOrder = async () => {
    if (!store?.id) return;
    if (!form.supplier.trim()) return;
    const validItems = form.items.filter(i => i.name.trim() && i.quantity > 0 && i.price_per_unit > 0);
    if (validItems.length === 0) return;

    setSaving(true);
    try {
      const items: RestockItem[] = validItems.map(i => ({
        type: i.type,
        name: i.name.trim(),
        sku: i.sku,
        product_id: i.product_id,
        quantity: i.quantity,
        price_per_unit: i.price_per_unit,
        total: i.quantity * i.price_per_unit,
      }));
      const total_amount = items.reduce((s, i) => s + i.total, 0);

      const { error: insertError } = await supabase.from('restock_orders').insert({
        store_id: store.id,
        supplier: form.supplier.trim(),
        status: 'in_transit',
        order_date: new Date().toISOString(),
        expected_date: form.expected_date ? new Date(form.expected_date).toISOString() : null,
        items: items as any,
        total_amount,
        delivery_cost: form.delivery_cost || 0,
        notes: form.notes.trim() || null,
      });

      if (insertError) throw insertError;

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      alert('Ошибка: ' + (err?.message || 'Не удалось создать'));
    } finally {
      setSaving(false);
    }
  };

  const acceptOrder = async (id: string) => {
    try {
      const { error: upErr } = await supabase
        .from('restock_orders')
        .update({ status: 'completed', delivery_cost: acceptDeliveryCost })
        .eq('id', id);
      if (upErr) throw upErr;
      setAcceptingId(null);
      setAcceptDeliveryCost(0);
      await loadData();
    } catch (err: any) {
      alert('Ошибка: ' + (err?.message || ''));
    }
  };

  const cancelOrder = async (id: string) => {
    try {
      const { error: upErr } = await supabase
        .from('restock_orders')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (upErr) throw upErr;
      await loadData();
    } catch (err: any) {
      alert('Ошибка: ' + (err?.message || ''));
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Удалить поставку?')) return;
    try {
      const { error: delErr } = await supabase.from('restock_orders').delete().eq('id', id);
      if (delErr) throw delErr;
      await loadData();
    } catch (err: any) {
      alert('Ошибка: ' + (err?.message || ''));
    }
  };

  // --- Form helpers ---

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateFormItem = (idx: number, updates: Partial<FormItem>) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, ...updates } : item),
    }));
  };

  const selectProduct = (idx: number, product: DBProduct) => {
    updateFormItem(idx, {
      type: 'existing',
      product_id: product.id,
      sku: product.sku || undefined,
      name: product.name,
      price_per_unit: product.price || 0,
      searchQuery: product.name,
      showDropdown: false,
    });
  };

  const setAsDraft = (idx: number, name: string) => {
    updateFormItem(idx, {
      type: 'draft',
      product_id: undefined,
      sku: undefined,
      name,
      searchQuery: name,
      showDropdown: false,
    });
  };

  const getFilteredProducts = (query: string) => {
    if (!query.trim()) return dbProducts.slice(0, 10);
    const q = query.toLowerCase();
    return dbProducts.filter(p =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    ).slice(0, 10);
  };

  // --- Filtering ---

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSupplier = o.supplier?.toLowerCase().includes(q);
      const matchItem = o.items.some(i => i.name.toLowerCase().includes(q));
      const matchNotes = o.notes?.toLowerCase().includes(q);
      if (!matchSupplier && !matchItem && !matchNotes) return false;
    }
    return true;
  });

  // --- Stats ---

  const stats = {
    total: orders.length,
    inTransit: orders.filter(o => o.status === 'in_transit').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalAmount: orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total_amount || 0), 0),
  };

  // --- Format ---

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return '—'; }
  };

  const formatAmount = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₸`;
    return `${v.toLocaleString('ru-RU')} ₸`;
  };

  const statusCfg: Record<string, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
    in_transit: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: Truck, label: 'В пути' },
    completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle, label: 'Получено' },
    cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle, label: 'Отменено' },
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = statusCfg[status] || statusCfg.in_transit;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  // --- Loading ---

  if (userLoading || (loading && orders.length === 0)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mb-6">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <a href="/app/warehouse" className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2">
            <ArrowLeft className="w-3 h-3" />
            Склад
          </a>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Поставки</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Учёт закупок и поступлений на склад</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Новая поставка
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Всего</p>
              <p className="text-sm lg:text-base font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm cursor-pointer transition-all ${statusFilter === 'in_transit' ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'in_transit' ? 'all' : 'in_transit')}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">В пути</p>
              <p className="text-sm lg:text-base font-bold text-purple-600">{stats.inTransit}</p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm cursor-pointer transition-all ${statusFilter === 'completed' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Получено</p>
              <p className="text-sm lg:text-base font-bold text-emerald-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Сумма</p>
              <p className="text-sm lg:text-base font-bold text-amber-600">{formatAmount(stats.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по поставщику, товару..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pl-10 pr-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Orders List */}
      {filtered.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((order) => {
              const itemCount = order.items.reduce((s, i) => s + (i.quantity || 0), 0);
              return (
                <div key={order.id}>
                  <div
                    className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    {/* Mobile */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">{order.supplier}</span>
                            <div className="mt-0.5"><StatusBadge status={order.status} /></div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{formatAmount(order.total_amount)}</div>
                          <div className="text-[10px] text-gray-400">{itemCount} шт · {order.items.length} поз</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.order_date)}
                        </span>
                        {order.expected_date && <span>Ожид: {formatDate(order.expected_date)}</span>}
                      </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900 dark:text-white">{order.supplier}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(order.order_date)}
                            </span>
                            {order.expected_date && <span>Ожид: {formatDate(order.expected_date)}</span>}
                            <span>{order.items.length} поз · {itemCount} шт</span>
                            {order.notes && <span className="text-gray-400 truncate max-w-[200px]">{order.notes}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-white">{formatAmount(order.total_amount)}</div>
                          {order.delivery_cost > 0 && (
                            <div className="text-xs text-gray-400">+ доставка {order.delivery_cost.toLocaleString('ru-RU')} ₸</div>
                          )}
                        </div>

                        {order.status === 'in_transit' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setAcceptingId(order.id); setAcceptDeliveryCost(order.delivery_cost || 0); }}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Принять
                          </button>
                        )}

                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded */}
                  {expandedId === order.id && (
                    <div className="px-3 sm:px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-100 dark:bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Товар</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Кол-во</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Цена/шт</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Сумма</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {order.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    {item.name}
                                    {item.type === 'draft' && (
                                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Новый</span>
                                    )}
                                  </div>
                                  {item.sku && <div className="text-[10px] text-gray-400">{item.sku}</div>}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-center text-gray-600 dark:text-gray-300">{item.quantity}</td>
                                <td className="px-4 py-2.5 text-sm text-right text-gray-600 dark:text-gray-300">{(item.price_per_unit || 0).toLocaleString('ru-RU')} ₸</td>
                                <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-900 dark:text-white">{(item.total || 0).toLocaleString('ru-RU')} ₸</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100 dark:bg-gray-700/50">
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">Товары:</td>
                              <td className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                                {order.items.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('ru-RU')} ₸
                              </td>
                            </tr>
                            {order.delivery_cost > 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">Доставка:</td>
                                <td className="px-4 py-2 text-right text-sm font-medium text-orange-600">{order.delivery_cost.toLocaleString('ru-RU')} ₸</td>
                              </tr>
                            )}
                            <tr className="border-t border-gray-200 dark:border-gray-600">
                              <td colSpan={3} className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Итого:</td>
                              <td className="px-4 py-2 text-right text-sm font-bold text-emerald-600">
                                {((order.total_amount || 0) + (order.delivery_cost || 0)).toLocaleString('ru-RU')} ₸
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3 justify-end">
                        {order.status === 'in_transit' && (
                          <>
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              Отменить
                            </button>
                            <button
                              onClick={() => { setAcceptingId(order.id); setAcceptDeliveryCost(order.delivery_cost || 0); }}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Принять
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">Показано {filtered.length} из {orders.length}</span>
              <span className="text-gray-500 dark:text-gray-400">
                Сумма: <span className="font-bold text-gray-900 dark:text-white">{formatAmount(filtered.reduce((s, o) => s + (o.total_amount || 0), 0))}</span>
              </span>
            </div>
          </div>
        </div>
      ) : !error && !loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm text-center">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
            {searchQuery || statusFilter !== 'all' ? 'Ничего не найдено' : 'Нет поставок'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {searchQuery || statusFilter !== 'all' ? 'Попробуйте изменить фильтры' : 'Создайте первую поставку'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Новая поставка
            </button>
          )}
        </div>
      ) : null}

      {/* --- NEW ORDER MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Новая поставка</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Поставщик *</label>
                <input
                  value={form.supplier}
                  onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))}
                  placeholder="Название поставщика"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Expected date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ожидаемая дата</label>
                <input
                  type="date"
                  value={form.expected_date}
                  onChange={(e) => setForm(f => ({ ...f, expected_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Товары *</label>
                <div className="space-y-3">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                      {/* Product search */}
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          value={item.searchQuery}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateFormItem(idx, { searchQuery: v, showDropdown: true, name: item.type === 'draft' ? v : item.name });
                          }}
                          onFocus={() => updateFormItem(idx, { showDropdown: true })}
                          placeholder="Поиск товара или введите название..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {item.type === 'existing' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">Kaspi</span>
                        )}
                        {item.type === 'draft' && item.name && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">Новый</span>
                        )}

                        {/* Dropdown */}
                        {item.showDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-48 overflow-y-auto">
                            {getFilteredProducts(item.searchQuery).map(p => (
                              <button
                                key={p.id}
                                onClick={() => selectProduct(idx, p)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <div className="text-sm text-gray-900 dark:text-white">{p.name}</div>
                                  {p.sku && <div className="text-[10px] text-gray-400">{p.sku}</div>}
                                </div>
                                {p.price && <span className="text-xs text-gray-500 shrink-0">{p.price.toLocaleString('ru-RU')} ₸</span>}
                              </button>
                            ))}
                            {item.searchQuery.trim() && (
                              <button
                                onClick={() => setAsDraft(idx, item.searchQuery.trim())}
                                className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-t border-gray-100 dark:border-gray-700"
                              >
                                <div className="flex items-center gap-2">
                                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                                  <span className="text-sm text-amber-600 font-medium">Новый: &quot;{item.searchQuery.trim()}&quot;</span>
                                </div>
                              </button>
                            )}
                            {!item.searchQuery.trim() && dbProducts.length === 0 && (
                              <div className="px-3 py-2 text-xs text-gray-400">Нет товаров в базе</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Name display + quantity/price */}
                      {item.name && (
                        <div className="flex gap-2 items-center">
                          <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                            {item.name}
                            {item.sku && <span className="text-[10px] text-gray-400 ml-1">({item.sku})</span>}
                          </div>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateFormItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                            placeholder="Кол"
                            className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <input
                            type="number"
                            value={item.price_per_unit || ''}
                            onChange={(e) => updateFormItem(idx, { price_per_unit: parseInt(e.target.value) || 0 })}
                            placeholder="Цена"
                            className="w-28 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          {form.items.length > 1 && (
                            <button onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addItem} className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Добавить товар
                </button>
              </div>

              {/* Delivery cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Стоимость доставки ₸</label>
                <input
                  type="number"
                  value={form.delivery_cost || ''}
                  onChange={(e) => setForm(f => ({ ...f, delivery_cost: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Заметка</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Примечание к заказу"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Total preview */}
              {form.items.some(i => i.name && i.quantity > 0) && (() => {
                const goodsTotal = form.items.filter(i => i.name).reduce((s, i) => s + (i.quantity * i.price_per_unit), 0);
                return (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-sm">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Товары ({form.items.filter(i => i.name).length} поз):</span>
                      <span>{goodsTotal.toLocaleString('ru-RU')} ₸</span>
                    </div>
                    {form.delivery_cost > 0 && (
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Доставка:</span>
                        <span>{form.delivery_cost.toLocaleString('ru-RU')} ₸</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <span>Итого:</span>
                      <span>{(goodsTotal + form.delivery_cost).toLocaleString('ru-RU')} ₸</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Отмена
              </button>
              <button
                onClick={createOrder}
                disabled={saving || !form.supplier.trim() || !form.items.some(i => i.name.trim())}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ACCEPT MODAL --- */}
      {acceptingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAcceptingId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Приёмка товара</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Фактическая стоимость доставки ₸</label>
              <input
                type="number"
                value={acceptDeliveryCost || ''}
                onChange={(e) => setAcceptDeliveryCost(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAcceptingId(null)} className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm">Отмена</button>
              <button
                onClick={() => acceptOrder(acceptingId)}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Принять
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refreshing */}
      {refreshing && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 z-40">
          <Loader2 className="w-4 h-4 animate-spin" />
          Обновление...
        </div>
      )}
    </div>
  );
}
