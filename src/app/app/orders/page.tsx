'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Truck,
  Zap,
  MapPin,
  Package,
  ArrowRightLeft,
  ShoppingBag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase/client';
import { getStale, setCache } from '@/lib/cache';

type OrderStatus = 'new' | 'sign_required' | 'pickup' | 'delivery' | 'kaspi_delivery' | 'archive' | 'completed' | 'cancelled' | 'returned';
type FilterStatus = 'all' | OrderStatus | 'awaiting' | 'transfer' | 'transmitted';
type SortField = 'code' | 'customer' | 'date' | 'items' | 'total' | 'status';
type SortDirection = 'asc' | 'desc';

interface Order {
  id: string;
  code: string;
  customer: string;
  phone: string;
  date: string;
  time: string;
  items: number;
  itemsList: any[];
  total: number;
  status: OrderStatus;
  rawStatus: string;
  delivery_address: string;
  delivery_date: string;
  completed_date: string;
  completed_time: string;
  payment: string;
}

// Маппинг статусов Kaspi на наши
// state: NEW, SIGN_REQUIRED, PICKUP, DELIVERY, KASPI_DELIVERY, ARCHIVE, RETURNED, CANCELLED
// status (API): APPROVED_BY_BANK, ACCEPTED_BY_MERCHANT, COMPLETED, CANCELLED, RETURNED
function mapKaspiStatus(status: string): OrderStatus {
  const s = status.toLowerCase().replace(/\s+/g, '_');
  // Точные совпадения state
  if (s === 'new' || s === 'approved_by_bank') return 'new';
  if (s === 'sign_required') return 'sign_required';
  if (s === 'pickup') return 'pickup';
  if (s === 'kaspi_delivery') return 'kaspi_delivery';
  if (s === 'delivery') return 'delivery';
  if (s === 'archive' || s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'cancelling') return 'cancelled';
  if (s === 'returned') return 'returned';
  // Совпадения по вхождению для обратной совместимости
  if (s.includes('kaspi_delivery')) return 'kaspi_delivery';
  if (s.includes('accepted_by_merchant') || s.includes('accepted')) return 'kaspi_delivery';
  if (s.includes('sign')) return 'sign_required';
  if (s.includes('delivery')) return 'delivery';
  if (s.includes('archive') || s.includes('completed')) return 'completed';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('return')) return 'returned';
  if (s.includes('new') || s.includes('pending') || s.includes('approved')) return 'new';
  return 'new';
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, store, loading: userLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const mapOrderData = (data: any[]): Order[] => {
    const mapped = data.map((o: any) => {
      const createdAt = new Date(o.created_at);
      let itemsList: any[] = [];
      try {
        const raw = o.items;
        if (Array.isArray(raw)) {
          itemsList = raw;
        } else if (typeof raw === 'string' && raw.trim()) {
          const parsed = JSON.parse(raw);
          itemsList = Array.isArray(parsed) ? parsed : [];
        } else if (raw && typeof raw === 'object') {
          itemsList = Object.values(raw);
        }
      } catch {
        itemsList = [];
      }
      const itemsCount = itemsList.length > 0
        ? itemsList.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0)
        : 1;

      const status = mapKaspiStatus(o.status || 'new');
      let completedDate = '';
      let completedTime = '';
      if ((status === 'completed' || status === 'archive') && o.delivery_date && o.delivery_date.includes('T')) {
        const completedAt = new Date(o.delivery_date);
        completedDate = completedAt.toLocaleDateString('ru-RU');
        completedTime = completedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      }

      return {
        id: o.id,
        code: o.kaspi_order_id || o.id.slice(0, 8),
        customer: o.customer_name || 'Не указан',
        phone: o.customer_phone || '',
        date: createdAt.toLocaleDateString('ru-RU'),
        time: createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        items: itemsCount,
        itemsList,
        total: Number(o.total_amount) || 0,
        status,
        rawStatus: (o.status || '').toLowerCase(),
        delivery_address: o.delivery_address || '',
        delivery_date: o.delivery_date || '',
        completed_date: completedDate,
        completed_time: completedTime,
        payment: 'kaspi',
      };
    });

    return mapped.filter(o =>
      !['completed', 'archive', 'cancelled', 'returned'].includes(o.status)
    );
  };

  useEffect(() => {
    if (store?.id) {
      const cacheKey = `orders_${store.id}`;
      const stale = getStale<Order[]>(cacheKey);
      if (stale) {
        setOrders(stale.data);
        setLoading(false);
      }
      loadOrders();
    }
  }, [store?.id]);

  const loadOrders = async () => {
    if (!store?.id) return;
    const cacheKey = `orders_${store.id}`;
    const hasCached = getStale<Order[]>(cacheKey) !== null;
    if (!hasCached) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const activeOnly = mapOrderData(data || []);
      setOrders(activeOnly);
      setCache(cacheKey, activeOnly);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!user?.id || syncing) return;
    setSyncing(true);
    try {
      const response = await fetch('/api/kaspi/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, daysBack: 14 })
      });
      const data = await response.json();
      if (data.success) {
        await loadOrders();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 text-gray-600" />
      : <ArrowDown className="w-4 h-4 text-gray-600" />;
  };

  const filteredOrders = orders
    .filter(o => {
      const matchesSearch = o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           o.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all'
        || (filterStatus as any) === 'awaiting' && (o.rawStatus.includes('awaiting') || o.rawStatus.includes('preorder') || o.rawStatus.includes('packing') || o.rawStatus === 'kaspi_delivery')
        || (filterStatus as any) === 'transfer' && o.rawStatus === 'kaspi_delivery_transfer'
        || (filterStatus as any) === 'transmitted' && o.rawStatus.includes('transmitted')
        || !['awaiting', 'transfer', 'transmitted'].includes(filterStatus as any) && o.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'customer':
          comparison = a.customer.localeCompare(b.customer);
          break;
        case 'date':
          comparison = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
          break;
        case 'items':
          comparison = a.items - b.items;
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const isAwaiting = (o: Order) => o.rawStatus.includes('awaiting') || o.rawStatus.includes('preorder') || o.rawStatus.includes('packing') || o.rawStatus === 'kaspi_delivery';

  const countByStatus = (status: FilterStatus) => {
    if (status === 'all') return orders.length;
    if (status === 'awaiting') return orders.filter(isAwaiting).length;
    if (status === 'transfer') return orders.filter(o => o.rawStatus === 'kaspi_delivery_transfer').length;
    if (status === 'transmitted') return orders.filter(o => o.rawStatus.includes('transmitted')).length;
    return orders.filter(o => o.status === status).length;
  };

  const totalByStatus = (status: FilterStatus) => {
    if (status === 'all') return orders.reduce((sum, o) => sum + o.total, 0);
    if (status === 'awaiting') return orders.filter(isAwaiting).reduce((sum, o) => sum + o.total, 0);
    if (status === 'transfer') return orders.filter(o => o.rawStatus === 'kaspi_delivery_transfer').reduce((sum, o) => sum + o.total, 0);
    if (status === 'transmitted') return orders.filter(o => o.rawStatus.includes('transmitted')).reduce((sum, o) => sum + o.total, 0);
    return orders.filter(o => o.status === status).reduce((sum, o) => sum + o.total, 0);
  };

  // Статистические карточки — все статусы из Kaspi API (state)
  const statsCards = [
    { key: 'all' as const, label: 'Все заказы', icon: ShoppingBag, color: 'bg-gray-100 dark:bg-gray-800', iconColor: 'text-gray-600 dark:text-gray-400', borderColor: 'border-gray-200 dark:border-gray-600' },
    { key: 'new' as const, label: 'Новые', icon: Zap, color: 'bg-orange-50 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', borderColor: 'border-orange-200 dark:border-orange-700' },
    { key: 'sign_required' as const, label: 'Подписание', icon: ArrowRightLeft, color: 'bg-yellow-50 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400', borderColor: 'border-yellow-200 dark:border-yellow-700' },
    { key: 'pickup' as const, label: 'Самовывоз', icon: MapPin, color: 'bg-purple-50 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', borderColor: 'border-purple-200 dark:border-purple-700' },
    { key: 'delivery' as const, label: 'Моя доставка', icon: Truck, color: 'bg-blue-50 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-200 dark:border-blue-700' },
    { key: 'awaiting' as const, label: 'Ожидает сборки', icon: Package, color: 'bg-amber-50 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', borderColor: 'border-amber-200 dark:border-amber-700' },
    { key: 'transfer' as const, label: 'Экспресс', icon: ArrowRightLeft, color: 'bg-teal-50 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400', borderColor: 'border-teal-200 dark:border-teal-700' },
    { key: 'transmitted' as const, label: 'Переданы на доставку', icon: Truck, color: 'bg-sky-50 dark:bg-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400', borderColor: 'border-sky-200 dark:border-sky-700' },
  ];

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'new': return 'bg-orange-500 text-white';
      case 'sign_required': return 'bg-yellow-500 text-white';
      case 'pickup': return 'bg-purple-500 text-white';
      case 'delivery': return 'bg-blue-500 text-white';
      case 'kaspi_delivery': return 'bg-cyan-600 text-white';
      case 'completed': case 'archive': return 'bg-emerald-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'returned': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: OrderStatus, rawStatus?: string) => {
    // Детальные подстатусы Kaspi Доставки
    if (status === 'kaspi_delivery' && rawStatus) {
      if (rawStatus.includes('transmitted')) return 'Переданы на доставку';
      if (rawStatus.includes('transfer')) return 'Передача';
      return 'Ожидает сборки';
    }
    switch (status) {
      case 'new': return 'Новый';
      case 'sign_required': return 'Подписание';
      case 'pickup': return 'Самовывоз';
      case 'delivery': return 'Моя доставка';
      case 'kaspi_delivery': return 'Ожидает сборки';
      case 'completed': case 'archive': return 'Завершён';
      case 'cancelled': return 'Отменён';
      case 'returned': return 'Возврат';
      default: return status;
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">Заказы</h1>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
        {statsCards.filter(card => card.key === 'all' || countByStatus(card.key) > 0).map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              onClick={() => setFilterStatus(card.key)}
              className={`flex-1 min-w-[140px] ${card.color} ${filterStatus === card.key ? `border-2 ${card.borderColor}` : 'border border-transparent'} rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${card.color}`}>
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{card.label}</span>
              </div>
              <div className="space-y-1">
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{countByStatus(card.key)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{totalByStatus(card.key).toLocaleString()} ₸</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск по номеру заказа или клиенту..."
                style={{ paddingLeft: '2.5rem' }}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 dark:focus:border-gray-500 transition-colors"
              />
            </div>
          </div>

          {/* Sync & Add Buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Синхр...' : 'Обновить'}
            </button>
            <button
              onClick={() => router.push('/app/orders/add')}
              className="px-4 sm:px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              + Добавить
            </button>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pt-4 pb-1">
          {[
            { key: 'all' as FilterStatus, label: 'Все', active: 'bg-gray-900 text-white', activeCount: 'text-gray-300' },
            { key: 'new' as FilterStatus, label: 'Новые', active: 'bg-orange-500 text-white', activeCount: 'text-orange-200' },
            { key: 'sign_required' as FilterStatus, label: 'Подписание', active: 'bg-yellow-500 text-white', activeCount: 'text-yellow-200' },
            { key: 'pickup' as FilterStatus, label: 'Самовывоз', active: 'bg-purple-500 text-white', activeCount: 'text-purple-200' },
            { key: 'delivery' as FilterStatus, label: 'Моя доставка', active: 'bg-blue-500 text-white', activeCount: 'text-blue-200' },
            { key: 'awaiting' as FilterStatus, label: 'Ожидает сборки', active: 'bg-amber-500 text-white', activeCount: 'text-amber-200' },
            { key: 'transfer' as FilterStatus, label: 'Передача', active: 'bg-teal-500 text-white', activeCount: 'text-teal-200' },
            { key: 'transmitted' as FilterStatus, label: 'Переданы на доставку', active: 'bg-sky-500 text-white', activeCount: 'text-sky-200' },
          ].filter(btn => btn.key === 'all' || btn.key === filterStatus || countByStatus(btn.key) > 0).map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilterStatus(btn.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === btn.key ? btn.active : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {btn.label} <span className={`text-xs ${filterStatus === btn.key ? btn.activeCount : 'text-gray-400 dark:text-gray-500'}`}>{countByStatus(btn.key)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders - Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">№ {order.code}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{order.customer}</p>
                <p className="text-xs text-gray-400 mt-1">{order.date} • {order.time}</p>
                {order.completed_date && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Выдан: {order.completed_date} • {order.completed_time}</p>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(order.status)}`}>
                {getStatusText(order.status, order.rawStatus)}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="space-y-1.5 mb-2">
                {order.itemsList.length > 0 ? order.itemsList.map((item: any, i: number) => (
                  <div key={i}>
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                      {item.product_name || 'Товар'} — {item.quantity || 1} шт.
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {Number(item.price || 0).toLocaleString()} ₸ / шт.
                    </p>
                  </div>
                )) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{order.items} шт.</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">Итого</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{order.total.toLocaleString()} ₸</span>
              </div>
            </div>
          </div>
        ))}

        {/* Mobile Total */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Итого: {filteredOrders.reduce((sum, o) => sum + o.items, 0)} шт.</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{filteredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()} ₸</span>
          </div>
        </div>
      </div>

      {/* Orders Table - Desktop */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th
                onClick={() => handleSort('code')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Номер заказа</span>
                  {getSortIcon('code')}
                </div>
              </th>
              <th
                onClick={() => handleSort('customer')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Клиент</span>
                  {getSortIcon('customer')}
                </div>
              </th>
              <th
                onClick={() => handleSort('date')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Дата и время</span>
                  {getSortIcon('date')}
                </div>
              </th>
              <th
                onClick={() => handleSort('items')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Товары</span>
                  {getSortIcon('items')}
                </div>
              </th>
              <th
                onClick={() => handleSort('total')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Сумма</span>
                  {getSortIcon('total')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Статус</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th className="text-right py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <td className="py-4 px-6">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{order.code}</p>
                </td>
                <td className="py-4 px-6">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer}</p>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{order.date}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.time}</p>
                    {order.completed_date && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Выдан: {order.completed_date} {order.completed_time}</p>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="space-y-0.5">
                    {order.itemsList.length > 0 ? order.itemsList.map((item: any, i: number) => (
                      <p key={i} className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[250px]">
                        {item.product_name || 'Товар'} — {item.quantity || 1} шт.
                      </p>
                    )) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">{order.items} шт.</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{order.total.toLocaleString()} ₸</span>
                    {order.itemsList.length > 0 && order.itemsList[0]?.price > 0 && (
                      <p className="text-xs text-gray-400">{Number(order.itemsList[0].price).toLocaleString()} ₸ / шт.</p>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status, order.rawStatus)}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <tr>
              <td colSpan={3} className="py-4 px-6">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Итого:</span>
              </td>
              <td className="py-4 px-6">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{filteredOrders.reduce((sum, o) => sum + o.items, 0)} шт.</span>
              </td>
              <td className="py-4 px-6">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{filteredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()} ₸</span>
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Детали заказа</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">№ {selectedOrder.code}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Статус заказа</span>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusText(selectedOrder.status, selectedOrder.rawStatus)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Информация о клиенте</h3>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Имя клиента</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder.customer || 'Не указан'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Телефон</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder.phone || 'Не указан'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Адрес доставки</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder.delivery_address || 'Не указан'}</p>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Товары</h3>
                <div className="space-y-2">
                  {selectedOrder.itemsList && selectedOrder.itemsList.length > 0 ? (
                    selectedOrder.itemsList.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-600 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name || 'Товар'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.quantity || 1} шт. x {Number(item.price || 0).toLocaleString()} ₸</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{Number(item.total || 0).toLocaleString()} ₸</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedOrder.items} шт.</p>
                  )}
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Детали заказа</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Дата заказа</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Время заказа</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder.time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Количество товаров</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrder.items} шт.</p>
                  </div>
                  {selectedOrder.completed_date ? (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Время выдачи</p>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{selectedOrder.completed_date} • {selectedOrder.completed_time}</p>
                    </div>
                  ) : selectedOrder.delivery_date ? (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Дата доставки</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(selectedOrder.delivery_date).toLocaleDateString('ru-RU')}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Price Info */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Общая сумма</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedOrder.total.toLocaleString()} ₸
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
