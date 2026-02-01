'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  ShoppingCart,
  Wallet,
  BarChart3,
  Users,
  Star,
  TrendingUp,
  Clock,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Truck,
  Ban,
} from 'lucide-react';

// Моковые данные кабинета Kaspi
const kaspiCabinetData = {
  merchant: {
    name: 'Luxstone KZ',
    merchantId: 'M-123456',
    rating: 4.8,
    reviewsCount: 1247,
    status: 'active',
    registeredAt: '2023-05-15',
  },
  balance: {
    available: 2450000,
    pending: 850000,
    hold: 125000,
  },
  stats: {
    ordersToday: 12,
    ordersThisWeek: 67,
    ordersThisMonth: 245,
    revenueToday: 1250000,
    revenueThisWeek: 4850000,
    revenueThisMonth: 18500000,
    productsActive: 156,
    productsOutOfStock: 8,
    avgOrderValue: 78500,
    returnRate: 2.3,
  },
  orders: [
    { id: 'KS-001247', date: '2025-01-31 14:25', customer: 'Иванов Иван', phone: '+7 777 ***-**-45', amount: 125000, status: 'new', items: 2 },
    { id: 'KS-001246', date: '2025-01-31 13:10', customer: 'Петрова Мария', phone: '+7 701 ***-**-89', amount: 89000, status: 'processing', items: 1 },
    { id: 'KS-001245', date: '2025-01-31 11:45', customer: 'Сидоров Алексей', phone: '+7 705 ***-**-12', amount: 245000, status: 'shipped', items: 3 },
    { id: 'KS-001244', date: '2025-01-31 10:30', customer: 'Козлова Ольга', phone: '+7 778 ***-**-67', amount: 67000, status: 'delivered', items: 1 },
    { id: 'KS-001243', date: '2025-01-30 18:20', customer: 'Новиков Сергей', phone: '+7 702 ***-**-34', amount: 156000, status: 'delivered', items: 2 },
    { id: 'KS-001242', date: '2025-01-30 16:15', customer: 'Морозова Елена', phone: '+7 707 ***-**-56', amount: 98000, status: 'delivered', items: 1 },
    { id: 'KS-001241', date: '2025-01-30 14:00', customer: 'Волков Андрей', phone: '+7 771 ***-**-78', amount: 312000, status: 'returned', items: 2 },
  ],
  products: [
    { sku: 'IP14P-256', name: 'iPhone 14 Pro 256GB', price: 549000, stock: 5, sales: 23, status: 'active' },
    { sku: 'APP2-W', name: 'AirPods Pro 2', price: 89900, stock: 12, sales: 45, status: 'active' },
    { sku: 'MBA-M2', name: 'MacBook Air M2', price: 749000, stock: 3, sales: 8, status: 'active' },
    { sku: 'AWU-49', name: 'Apple Watch Ultra 49mm', price: 449000, stock: 0, sales: 15, status: 'out_of_stock' },
    { sku: 'IPP-129', name: 'iPad Pro 12.9"', price: 599000, stock: 7, sales: 12, status: 'active' },
    { sku: 'SGS23-U', name: 'Samsung Galaxy S23 Ultra', price: 489000, stock: 4, sales: 18, status: 'active' },
    { sku: 'IP15-128', name: 'iPhone 15 128GB', price: 449000, stock: 0, sales: 31, status: 'out_of_stock' },
  ],
  reviews: [
    { id: 1, customer: 'Алексей К.', rating: 5, text: 'Отличный магазин, быстрая доставка!', date: '2025-01-30', product: 'iPhone 14 Pro' },
    { id: 2, customer: 'Мария П.', rating: 5, text: 'Всё супер, рекомендую', date: '2025-01-29', product: 'AirPods Pro 2' },
    { id: 3, customer: 'Иван С.', rating: 4, text: 'Хороший товар, упаковка могла быть лучше', date: '2025-01-28', product: 'MacBook Air M2' },
    { id: 4, customer: 'Ольга Н.', rating: 5, text: 'Очень довольна покупкой!', date: '2025-01-27', product: 'Apple Watch Ultra' },
    { id: 5, customer: 'Дмитрий В.', rating: 3, text: 'Долго ждал доставку', date: '2025-01-26', product: 'iPad Pro' },
  ],
};

export default function KaspiCabinetPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'reviews' | 'finance'>('overview');

  const getOrderStatusInfo = (status: string) => {
    switch (status) {
      case 'new': return { text: 'Новый', color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-4 h-4" /> };
      case 'processing': return { text: 'В обработке', color: 'bg-amber-100 text-amber-700', icon: <RefreshCw className="w-4 h-4" /> };
      case 'shipped': return { text: 'Отправлен', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-4 h-4" /> };
      case 'delivered': return { text: 'Доставлен', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-4 h-4" /> };
      case 'returned': return { text: 'Возврат', color: 'bg-red-100 text-red-700', icon: <Ban className="w-4 h-4" /> };
      default: return { text: status, color: 'bg-gray-100 text-gray-700', icon: null };
    }
  };

  const data = kaspiCabinetData;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-amber-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-amber-600 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{data.merchant.name}</h1>
                  <span className="px-2 py-0.5 bg-amber-600 rounded text-xs">Только просмотр</span>
                </div>
                <p className="text-amber-100 text-sm">ID: {data.merchant.merchantId} • Рейтинг: {data.merchant.rating} ({data.merchant.reviewsCount} отзывов)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-amber-100 text-sm">
              <Eye className="w-4 h-4" />
              Режим просмотра
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-px">
            {[
              { id: 'overview', label: 'Обзор', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'orders', label: 'Заказы', icon: <ShoppingCart className="w-4 h-4" /> },
              { id: 'products', label: 'Товары', icon: <Package className="w-4 h-4" /> },
              { id: 'reviews', label: 'Отзывы', icon: <Star className="w-4 h-4" /> },
              { id: 'finance', label: 'Финансы', icon: <Wallet className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-amber-600 rounded-t-lg'
                    : 'text-amber-100 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <ShoppingCart className="w-4 h-4" />
                  Заказов сегодня
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.stats.ordersToday}</div>
                <div className="text-xs text-emerald-600">+15% к вчера</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <Wallet className="w-4 h-4" />
                  Выручка сегодня
                </div>
                <div className="text-2xl font-bold text-gray-900">{(data.stats.revenueToday / 1000000).toFixed(1)}M ₸</div>
                <div className="text-xs text-emerald-600">+8% к вчера</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <Package className="w-4 h-4" />
                  Активных товаров
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.stats.productsActive}</div>
                <div className="text-xs text-red-600">{data.stats.productsOutOfStock} нет в наличии</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Средний чек
                </div>
                <div className="text-2xl font-bold text-gray-900">{(data.stats.avgOrderValue / 1000).toFixed(0)}k ₸</div>
                <div className="text-xs text-gray-500">Возвраты: {data.stats.returnRate}%</div>
              </div>
            </div>

            {/* Balance */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Баланс</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{(data.balance.available / 1000000).toFixed(2)}M ₸</div>
                  <div className="text-sm text-gray-600">Доступно</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{(data.balance.pending / 1000).toFixed(0)}k ₸</div>
                  <div className="text-sm text-gray-600">Ожидает</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{(data.balance.hold / 1000).toFixed(0)}k ₸</div>
                  <div className="text-sm text-gray-600">Заморожено</div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Последние заказы</h3>
              <div className="space-y-2">
                {data.orders.slice(0, 5).map(order => {
                  const status = getOrderStatusInfo(order.status);
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-lg ${status.color}`}>{status.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{order.id}</div>
                          <div className="text-xs text-gray-500">{order.customer} • {order.items} товаров</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{(order.amount / 1000).toFixed(0)}k ₸</div>
                        <div className="text-xs text-gray-500">{order.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID заказа</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Дата</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Покупатель</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Телефон</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Товаров</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Сумма</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.orders.map(order => {
                      const status = getOrderStatusInfo(order.status);
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{order.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{order.customer}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{order.phone}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.items}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{(order.amount / 1000).toFixed(0)}k ₸</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                              {status.icon}
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Название</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Цена</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Остаток</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Продаж</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.products.map(product => (
                      <tr key={product.sku} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">{product.sku}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{(product.price / 1000).toFixed(0)}k ₸</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${product.stock === 0 ? 'text-red-600' : product.stock < 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{product.sales}</td>
                        <td className="px-4 py-3">
                          {product.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3" />
                              Активен
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3" />
                              Нет в наличии
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {data.reviews.map(review => (
              <div key={review.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{review.customer}</div>
                    <div className="text-xs text-gray-500">{review.product} • {review.date}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{review.text}</p>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'finance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Balance Card */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Текущий баланс</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-sm text-emerald-600 mb-1">Доступно к выводу</div>
                  <div className="text-3xl font-bold text-emerald-700">{(data.balance.available / 1000000).toFixed(2)}M ₸</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm text-amber-600 mb-1">Ожидает зачисления</div>
                  <div className="text-3xl font-bold text-amber-700">{(data.balance.pending / 1000).toFixed(0)}k ₸</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Заморожено</div>
                  <div className="text-3xl font-bold text-gray-700">{(data.balance.hold / 1000).toFixed(0)}k ₸</div>
                </div>
              </div>
            </div>

            {/* Revenue Stats */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика выручки</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Сегодня</div>
                  <div className="text-2xl font-bold text-gray-900">{(data.stats.revenueToday / 1000000).toFixed(2)}M ₸</div>
                  <div className="text-xs text-gray-500">{data.stats.ordersToday} заказов</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">За неделю</div>
                  <div className="text-2xl font-bold text-gray-900">{(data.stats.revenueThisWeek / 1000000).toFixed(2)}M ₸</div>
                  <div className="text-xs text-gray-500">{data.stats.ordersThisWeek} заказов</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">За месяц</div>
                  <div className="text-2xl font-bold text-gray-900">{(data.stats.revenueThisMonth / 1000000).toFixed(2)}M ₸</div>
                  <div className="text-xs text-gray-500">{data.stats.ordersThisMonth} заказов</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
