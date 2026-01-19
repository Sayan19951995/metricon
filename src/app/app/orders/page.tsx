'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Clock,
  RefreshCw,
  Package,
  CheckCircle,
  Search,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type FilterStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type SortField = 'code' | 'customer' | 'date' | 'items' | 'total' | 'status';
type SortDirection = 'asc' | 'desc';

export default function OrdersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Фиктивные данные заказов
  const [orders] = useState([
    {
      id: 1,
      code: 'ORD-2025-001',
      customer: 'Алексей Иванов',
      date: '14.01.2025',
      time: '14:30',
      items: 3,
      total: 1287000,
      status: 'pending' as OrderStatus,
      payment: 'card',
      delivery: 'courier'
    },
    {
      id: 2,
      code: 'ORD-2025-002',
      customer: 'Мария Петрова',
      date: '14.01.2025',
      time: '12:15',
      items: 1,
      total: 549000,
      status: 'processing' as OrderStatus,
      payment: 'kaspi',
      delivery: 'pickup'
    },
    {
      id: 3,
      code: 'ORD-2025-003',
      customer: 'Дмитрий Сидоров',
      date: '13.01.2025',
      time: '18:45',
      items: 2,
      total: 838000,
      status: 'shipped' as OrderStatus,
      payment: 'cash',
      delivery: 'courier'
    },
    {
      id: 4,
      code: 'ORD-2025-004',
      customer: 'Анна Смирнова',
      date: '13.01.2025',
      time: '10:20',
      items: 4,
      total: 1456000,
      status: 'delivered' as OrderStatus,
      payment: 'card',
      delivery: 'courier'
    },
    {
      id: 5,
      code: 'ORD-2025-005',
      customer: 'Сергей Козлов',
      date: '12.01.2025',
      time: '16:30',
      items: 1,
      total: 149000,
      status: 'cancelled' as OrderStatus,
      payment: 'kaspi',
      delivery: 'pickup'
    },
    {
      id: 6,
      code: 'ORD-2025-006',
      customer: 'Елена Новикова',
      date: '12.01.2025',
      time: '11:00',
      items: 2,
      total: 728000,
      status: 'delivered' as OrderStatus,
      payment: 'card',
      delivery: 'courier'
    },
  ]);

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
      const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
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
          comparison = b.id - a.id; // Newer orders have higher IDs
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

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'processing': return 'В обработке';
      case 'shipped': return 'Отправлен';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменён';
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Заказы</h1>
        <p className="text-gray-500 text-sm">Управление заказами и доставкой</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div
          onClick={() => setFilterStatus('all')}
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Всего</span>
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>

        <div
          onClick={() => setFilterStatus('pending')}
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Ожидают</span>
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.pending}</p>
        </div>

        <div
          onClick={() => setFilterStatus('processing')}
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">В обработке</span>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.processing}</p>
        </div>

        <div
          onClick={() => setFilterStatus('shipped')}
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Отправлены</span>
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.shipped}</p>
        </div>

        <div
          onClick={() => setFilterStatus('delivered')}
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Доставлены</span>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.delivered}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4">
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 transition-colors"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ожидают
            </button>
            <button
              onClick={() => setFilterStatus('processing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filterStatus === 'processing'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              В обработке
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => router.push('/app/orders/add')}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            + Добавить заказ
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('code')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Номер заказа</span>
                  {getSortIcon('code')}
                </div>
              </th>
              <th
                onClick={() => handleSort('customer')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Клиент</span>
                  {getSortIcon('customer')}
                </div>
              </th>
              <th
                onClick={() => handleSort('date')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Дата и время</span>
                  {getSortIcon('date')}
                </div>
              </th>
              <th
                onClick={() => handleSort('items')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Товары</span>
                  {getSortIcon('items')}
                </div>
              </th>
              <th
                onClick={() => handleSort('total')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Сумма</span>
                  {getSortIcon('total')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Статус</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th className="text-right py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, index) => (
              <motion.tr
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-6">
                  <div>
                    <p className="font-semibold text-sm">{order.code}</p>
                    <p className="text-xs text-gray-500">{order.delivery === 'courier' ? '🚚 Курьер' : '📦 Самовывоз'}</p>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="text-sm font-medium">{order.customer}</p>
                    <p className="text-xs text-gray-500">{order.payment === 'card' ? '💳 Карта' : order.payment === 'kaspi' ? '🟣 Kaspi' : '💵 Наличные'}</p>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="text-sm">{order.date}</p>
                    <p className="text-xs text-gray-500">{order.time}</p>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-gray-600">{order.items} шт.</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold">{order.total.toLocaleString()} ₸</span>
                </td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors group cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold">Детали заказа</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedOrder.code}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Статус заказа</span>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusText(selectedOrder.status)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Информация о клиенте</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Имя клиента</p>
                    <p className="text-sm font-medium">{selectedOrder.customer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Способ оплаты</p>
                    <p className="text-sm font-medium">
                      {selectedOrder.payment === 'card' ? '💳 Карта' :
                       selectedOrder.payment === 'kaspi' ? '🟣 Kaspi' : '💵 Наличные'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Детали заказа</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Дата заказа</p>
                    <p className="text-sm font-medium">{selectedOrder.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Время заказа</p>
                    <p className="text-sm font-medium">{selectedOrder.time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Количество товаров</p>
                    <p className="text-sm font-medium">{selectedOrder.items} шт.</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Способ доставки</p>
                    <p className="text-sm font-medium">
                      {selectedOrder.delivery === 'courier' ? '🚚 Курьер' : '📦 Самовывоз'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Info */}
              <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Общая сумма</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {selectedOrder.total.toLocaleString()} ₸
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
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
