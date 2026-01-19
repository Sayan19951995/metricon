'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Package,
  CheckCircle,
  Archive,
  AlertTriangle,
  Search,
  Edit,
  ChevronRight,
  X
} from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editPreorder, setEditPreorder] = useState('');

  // Примерные данные товаров
  const [products] = useState([
    { id: 1, name: 'iPhone 14 Pro 256GB Deep Purple', sku: 'IP14-256-DP', price: 549000, stock: 12, category: 'Смартфоны', status: 'active', image: '📱', preorder: null },
    { id: 2, name: 'MacBook Air M2 13" 256GB Midnight', sku: 'MBA-M2-256-MN', price: 689000, stock: 8, category: 'Ноутбуки', status: 'active', image: '💻', preorder: 3 },
    { id: 3, name: 'AirPods Pro 2nd Generation', sku: 'APP-2GEN', price: 149000, stock: 25, category: 'Аксессуары', status: 'active', image: '🎧', preorder: null },
    { id: 4, name: 'Apple Watch Series 9 45mm GPS', sku: 'AWS9-45-GPS', price: 239000, stock: 15, category: 'Часы', status: 'active', image: '⌚', preorder: 2 },
    { id: 5, name: 'iPad Air 5th Gen 64GB Wi-Fi', sku: 'IPA5-64-WF', price: 329000, stock: 6, category: 'Планшеты', status: 'active', image: '📱', preorder: 5 },
    { id: 6, name: 'Magic Keyboard для iPad Pro', sku: 'MK-IPP', price: 189000, stock: 4, category: 'Аксессуары', status: 'active', image: '⌨️', preorder: null },
    { id: 7, name: 'iPhone 13 128GB Midnight', sku: 'IP13-128-MN', price: 419000, stock: 0, category: 'Смартфоны', status: 'archived', image: '📱', preorder: null },
    { id: 8, name: 'AirPods 2nd Generation', sku: 'AP-2GEN', price: 89000, stock: 35, category: 'Аксессуары', status: 'active', image: '🎧', preorder: 7 },
  ]);

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' ||
                           (filterStatus === 'active' && p.status === 'active') ||
                           (filterStatus === 'archived' && p.status === 'archived');
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return b.price - a.price;
      if (sortBy === 'stock') return b.stock - a.stock;
      return 0;
    });

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    archived: products.filter(p => p.status === 'archived').length,
    lowStock: products.filter(p => p.stock > 0 && p.stock < 10).length,
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setEditPrice(product.price.toString());
    setEditPreorder(product.preorder ? product.preorder.toString() : '');
  };

  const handleSave = () => {
    // Здесь будет логика сохранения
    console.log('Сохранение:', { price: editPrice, preorder: editPreorder });
    setEditingProduct(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Товары</h1>
        <p className="text-gray-500 text-sm">Управление ассортиментом магазина</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div
          onClick={() => setFilterStatus('all')}
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Всего товаров</span>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>

        <div
          onClick={() => setFilterStatus('active')}
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">В продаже</span>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>

        <div
          onClick={() => setFilterStatus('archived')}
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">В архиве</span>
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <Archive className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.archived}</p>
        </div>

        <div
          className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Низкий остаток</span>
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.lowStock}</p>
        </div>
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
                placeholder="Поиск по названию или SKU..."
                style={{ paddingLeft: '2.5rem' }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterStatus === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterStatus === 'active'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Активные
              </button>
              <button
                onClick={() => setFilterStatus('archived')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterStatus === 'archived'
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Архив
              </button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap hidden sm:inline">Сортировка:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-300 cursor-pointer flex-1 sm:flex-none"
              >
                <option value="name">По названию</option>
                <option value="price">По цене</option>
                <option value="stock">По остатку</option>
              </select>
            </div>

            {/* Add Button */}
            <button className="px-4 sm:px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap">
              + Добавить
            </button>
          </div>
        </div>
      </div>

      {/* Products - Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                {product.image}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-gray-500 font-mono">{product.sku}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-semibold">{product.price.toLocaleString()} ₸</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    product.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {product.status === 'active' ? 'Активный' : 'Архив'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => router.push(`/app/products/${product.sku}`)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Products Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Товар</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">SKU</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Категория</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Цена</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Предзаказ</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Статус</th>
              <th className="text-right py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, index) => (
              <motion.tr
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                      {product.image}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-gray-600 font-mono">{product.sku}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-gray-600">{product.category}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold">{product.price.toLocaleString()} ₸</span>
                </td>
                <td className="py-4 px-6">
                  {product.preorder ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {product.preorder} {product.preorder === 1 ? 'день' : product.preorder < 5 ? 'дня' : 'дней'}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">нет</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    product.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {product.status === 'active' ? 'Активный' : 'Архив'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => router.push(`/app/products/${product.sku}`)}
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

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Редактировать товар</h2>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                  {editingProduct.image}
                </div>
                <div>
                  <p className="font-medium text-sm">{editingProduct.name}</p>
                  <p className="text-xs text-gray-500">{editingProduct.sku}</p>
                </div>
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена (₸)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Введите цену"
                />
              </div>

              {/* Preorder Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Предзаказ (дни)
                </label>
                <input
                  type="number"
                  value={editPreorder}
                  onChange={(e) => setEditPreorder(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Оставьте пустым если нет предзаказа"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Укажите количество дней для предзаказа или оставьте пустым
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
