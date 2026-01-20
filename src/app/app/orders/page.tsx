'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';

type OrderStatus = 'my_delivery' | 'express' | 'pickup' | 'packing' | 'transfer' | 'offline' | 'transferred';
type FilterStatus = 'all' | OrderStatus;
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
      status: 'my_delivery' as OrderStatus,
      payment: 'kaspi',
    },
    {
      id: 2,
      code: 'ORD-2025-002',
      customer: 'Мария Петрова',
      date: '14.01.2025',
      time: '12:15',
      items: 1,
      total: 549000,
      status: 'express' as OrderStatus,
      payment: 'kaspi',
    },
    {
      id: 3,
      code: 'ORD-2025-003',
      customer: 'Дмитрий Сидоров',
      date: '13.01.2025',
      time: '18:45',
      items: 2,
      total: 838000,
      status: 'pickup' as OrderStatus,
      payment: 'kaspi',
    },
    {
      id: 4,
      code: 'ORD-2025-004',
      customer: 'Анна Смирнова',
      date: '13.01.2025',
      time: '10:20',
      items: 4,
      total: 1456000,
      status: 'packing' as OrderStatus,
      payment: 'kaspi',
    },
    {
      id: 5,
      code: 'ORD-2025-005',
      customer: 'Сергей Козлов',
      date: '12.01.2025',
      time: '16:30',
      items: 1,
      total: 149000,
      status: 'transfer' as OrderStatus,
      payment: 'kaspi',
    },
    {
      id: 6,
      code: 'ORD-2025-006',
      customer: 'Елена Новикова',
      date: '12.01.2025',
      time: '11:00',
      items: 2,
      total: 728000,
      status: 'offline' as OrderStatus,
      payment: 'kaspi',
    },
    {
      id: 7,
      code: 'ORD-2025-007',
      customer: 'Иван Петров',
      date: '11.01.2025',
      time: '09:15',
      items: 1,
      total: 325000,
      status: 'transferred' as OrderStatus,
      payment: 'kaspi',
    },
    {
      id: 8,
      code: 'ORD-2025-008',
      customer: 'Ольга Сидорова',
      date: '11.01.2025',
      time: '15:45',
      items: 2,
      total: 890000,
      status: 'my_delivery' as OrderStatus,
      payment: 'kaspi',
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

  // Подсчёт заказов по статусам
  const statusCounts = {
    all: orders.length,
    my_delivery: orders.filter(o => o.status === 'my_delivery').length,
    express: orders.filter(o => o.status === 'express').length,
    pickup: orders.filter(o => o.status === 'pickup').length,
    packing: orders.filter(o => o.status === 'packing').length,
    transfer: orders.filter(o => o.status === 'transfer').length,
    offline: orders.filter(o => o.status === 'offline').length,
    transferred: orders.filter(o => o.status === 'transferred').length,
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'my_delivery': return 'bg-blue-100 text-blue-700';
      case 'express': return 'bg-orange-100 text-orange-700';
      case 'pickup': return 'bg-purple-100 text-purple-700';
      case 'packing': return 'bg-yellow-100 text-yellow-700';
      case 'transfer': return 'bg-cyan-100 text-cyan-700';
      case 'offline': return 'bg-gray-100 text-gray-700';
      case 'transferred': return 'bg-emerald-100 text-emerald-700';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'my_delivery': return 'Моя доставка';
      case 'express': return 'Экспресс';
      case 'pickup': return 'Самовывоз';
      case 'packing': return 'Упаковка';
      case 'transfer': return 'Передача';
      case 'offline': return 'Оффлайн';
      case 'transferred': return 'Передан';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Заказы</h1>
        <p className="text-gray-500 text-sm">Управление заказами и доставкой</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 transition-colors"
              />
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={() => router.push('/app/orders/add')}
            className="px-4 sm:px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            + Добавить
          </button>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pt-4 pb-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Все <span className={`text-xs ${filterStatus === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>{statusCounts.all}</span>
          </button>
          <button
            onClick={() => setFilterStatus('my_delivery')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'my_delivery'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Моя доставка <span className={`text-xs ${filterStatus === 'my_delivery' ? 'text-blue-200' : 'text-gray-400'}`}>{statusCounts.my_delivery}</span>
          </button>
          <button
            onClick={() => setFilterStatus('express')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'express'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Экспресс <span className={`text-xs ${filterStatus === 'express' ? 'text-orange-200' : 'text-gray-400'}`}>{statusCounts.express}</span>
          </button>
          <button
            onClick={() => setFilterStatus('pickup')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'pickup'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Самовывоз <span className={`text-xs ${filterStatus === 'pickup' ? 'text-purple-200' : 'text-gray-400'}`}>{statusCounts.pickup}</span>
          </button>
          <button
            onClick={() => setFilterStatus('packing')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'packing'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Упаковка <span className={`text-xs ${filterStatus === 'packing' ? 'text-yellow-200' : 'text-gray-400'}`}>{statusCounts.packing}</span>
          </button>
          <button
            onClick={() => setFilterStatus('transfer')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'transfer'
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Передача <span className={`text-xs ${filterStatus === 'transfer' ? 'text-cyan-200' : 'text-gray-400'}`}>{statusCounts.transfer}</span>
          </button>
          <button
            onClick={() => setFilterStatus('offline')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'offline'
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Оффлайн <span className={`text-xs ${filterStatus === 'offline' ? 'text-gray-400' : 'text-gray-400'}`}>{statusCounts.offline}</span>
          </button>
          <button
            onClick={() => setFilterStatus('transferred')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'transferred'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Передан <span className={`text-xs ${filterStatus === 'transferred' ? 'text-emerald-200' : 'text-gray-400'}`}>{statusCounts.transferred}</span>
          </button>
        </div>
      </div>

      {/* Orders - Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {filteredOrders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white rounded-xl p-4 shadow-sm"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">{order.code}</p>
                <p className="text-xs text-gray-500">{order.customer}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 text-gray-500">
                <span>{order.date}</span>
                <span>{order.items} шт.</span>
              </div>
              <span className="font-semibold">{order.total.toLocaleString()} ₸</span>
            </div>
          </motion.div>
        ))}

        {/* Mobile Total */}
        <div className="bg-white rounded-xl p-4 shadow-sm border-t-2 border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Итого: {filteredOrders.reduce((sum, o) => sum + o.items, 0)} шт.</span>
            <span className="text-sm font-bold text-gray-900">{filteredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()} ₸</span>
          </div>
        </div>
      </div>

      {/* Orders Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm overflow-hidden">
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
                  <p className="font-semibold text-sm">{order.code}</p>
                </td>
                <td className="py-4 px-6">
                  <p className="text-sm font-medium">{order.customer}</p>
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
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={3} className="py-4 px-6">
                <span className="text-sm font-semibold text-gray-700">Итого:</span>
              </td>
              <td className="py-4 px-6">
                <span className="text-sm font-semibold text-gray-900">{filteredOrders.reduce((sum, o) => sum + o.items, 0)} шт.</span>
              </td>
              <td className="py-4 px-6">
                <span className="text-sm font-bold text-gray-900">{filteredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()} ₸</span>
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
                <div>
                  <p className="text-xs text-gray-500">Имя клиента</p>
                  <p className="text-sm font-medium">{selectedOrder.customer}</p>
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
