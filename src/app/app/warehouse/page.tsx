'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, Settings, ArrowRightLeft, Minus, Plus, Truck, AlertTriangle, History } from 'lucide-react';
import Link from 'next/link';
import CreateOrderModal from '@/components/warehouse/CreateOrderModal';

// Анимации
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

type WarehouseTab = 'all' | 'almaty' | 'astana' | 'karaganda' | 'shymkent';

// Данные товаров на складе
const warehouseProducts = [
  { id: 1, name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', qty: 15, inTransit: 10, costPrice: 485000, price: 549000, warehouse: 'almaty' },
  { id: 2, name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', qty: 8, inTransit: 0, costPrice: 420000, price: 489000, warehouse: 'almaty' },
  { id: 3, name: 'AirPods Pro 2', sku: 'APL-APP2', qty: 32, inTransit: 20, costPrice: 89000, price: 109000, warehouse: 'almaty' },
  { id: 4, name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', qty: 5, inTransit: 5, costPrice: 890000, price: 999000, warehouse: 'astana' },
  { id: 5, name: 'iPad Air 5th Gen', sku: 'APL-IPA5', qty: 12, inTransit: 0, costPrice: 285000, price: 339000, warehouse: 'almaty' },
  { id: 6, name: 'Apple Watch Ultra', sku: 'APL-AWU', qty: 18, inTransit: 0, costPrice: 320000, price: 389000, warehouse: 'astana' },
  { id: 7, name: 'Sony WH-1000XM5', sku: 'SNY-WH1000', qty: 25, inTransit: 15, costPrice: 145000, price: 179000, warehouse: 'karaganda' },
  { id: 8, name: 'Google Pixel 8 Pro', sku: 'GOO-PX8P', qty: 6, inTransit: 0, costPrice: 380000, price: 449000, warehouse: 'almaty' },
  { id: 9, name: 'Samsung Galaxy Tab S9', sku: 'SAM-TABS9', qty: 10, inTransit: 5, costPrice: 290000, price: 359000, warehouse: 'shymkent' },
  { id: 10, name: 'Nintendo Switch OLED', sku: 'NIN-SWOLED', qty: 14, inTransit: 0, costPrice: 165000, price: 199000, warehouse: 'almaty' },
  { id: 11, name: 'DJI Mini 3 Pro', sku: 'DJI-M3P', qty: 4, inTransit: 3, costPrice: 420000, price: 499000, warehouse: 'astana' },
  { id: 12, name: 'Bose QuietComfort 45', sku: 'BOSE-QC45', qty: 20, inTransit: 0, costPrice: 125000, price: 159000, warehouse: 'karaganda' },
];

export default function WarehousePage() {
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState<WarehouseTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  // Фильтрация по складу, поиску и критическому остатку
  const filteredProducts = warehouseProducts.filter(product => {
    const matchesWarehouse = activeTab === 'all' || product.warehouse === activeTab;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCritical = !showCriticalOnly || product.qty < 10;
    return matchesWarehouse && matchesSearch && matchesCritical;
  });

  // Подсчёт товаров по складам
  const warehouseCounts = {
    all: warehouseProducts.length,
    almaty: warehouseProducts.filter(p => p.warehouse === 'almaty').length,
    astana: warehouseProducts.filter(p => p.warehouse === 'astana').length,
    karaganda: warehouseProducts.filter(p => p.warehouse === 'karaganda').length,
    shymkent: warehouseProducts.filter(p => p.warehouse === 'shymkent').length,
  };

  // Суммарные значения
  const totalQty = filteredProducts.reduce((sum, p) => sum + p.qty, 0);
  const totalCost = filteredProducts.reduce((sum, p) => sum + (p.costPrice * p.qty), 0);
  const totalPrice = filteredProducts.reduce((sum, p) => sum + (p.price * p.qty), 0);
  const totalInTransit = filteredProducts.reduce((sum, p) => sum + p.inTransit, 0);
  const criticalCount = filteredProducts.filter(p => p.qty < 10).length;

  const getWarehouseName = (warehouse: string) => {
    switch (warehouse) {
      case 'almaty': return 'Алматы';
      case 'astana': return 'Астана';
      case 'karaganda': return 'Караганда';
      case 'shymkent': return 'Шымкент';
      default: return warehouse;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Склад</h1>
          <p className="text-gray-500 text-sm">Остатки товаров на складах</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/warehouse/history"
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">История приёмок</span>
          </Link>
          <Link
            href="/app/warehouse/settings"
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
            title="Настройки складов"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </div>

      {/* Stats Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Себестоимость склада</p>
              <p className="text-lg font-bold text-gray-900">{totalCost.toLocaleString()} ₸</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Оценочная стоимость</p>
              <p className="text-lg font-bold text-emerald-600">{totalPrice.toLocaleString()} ₸</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowCriticalOnly(!showCriticalOnly)}
          className={`bg-white rounded-xl p-4 shadow-sm text-left transition-all cursor-pointer ${
            showCriticalOnly ? 'ring-2 ring-amber-500' : 'hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Критический остаток</p>
              <p className="text-lg font-bold text-amber-600">{criticalCount} товаров</p>
            </div>
          </div>
        </button>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">В пути</p>
              <p className="text-lg font-bold text-purple-600">{totalInTransit} шт</p>
            </div>
          </div>
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
                placeholder="Поиск по названию или артикулу..."
                style={{ paddingLeft: '2.5rem' }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 transition-colors"
              />
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowCreateOrderModal(true)}
            className="px-4 sm:px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            + Добавить
          </button>
        </div>

        {/* Warehouse Tabs */}
        <div className="flex gap-2 overflow-x-auto pt-4 pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Все склады <span className={`text-xs ${activeTab === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>{warehouseCounts.all}</span>
          </button>
          <button
            onClick={() => setActiveTab('almaty')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'almaty'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Алматы <span className={`text-xs ${activeTab === 'almaty' ? 'text-blue-200' : 'text-gray-400'}`}>{warehouseCounts.almaty}</span>
          </button>
          <button
            onClick={() => setActiveTab('astana')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'astana'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Астана <span className={`text-xs ${activeTab === 'astana' ? 'text-purple-200' : 'text-gray-400'}`}>{warehouseCounts.astana}</span>
          </button>
          <button
            onClick={() => setActiveTab('karaganda')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'karaganda'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Караганда <span className={`text-xs ${activeTab === 'karaganda' ? 'text-orange-200' : 'text-gray-400'}`}>{warehouseCounts.karaganda}</span>
          </button>
          <button
            onClick={() => setActiveTab('shymkent')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'shymkent'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Шымкент <span className={`text-xs ${activeTab === 'shymkent' ? 'text-emerald-200' : 'text-gray-400'}`}>{warehouseCounts.shymkent}</span>
          </button>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Products - Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              variants={itemVariants}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ml-2">
                  {getWarehouseName(product.warehouse)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-gray-500">
                  <span className="font-medium text-gray-900">{product.qty} шт</span>
                  <span>{product.costPrice.toLocaleString()} ₸</span>
                </div>
                <span className="font-semibold text-emerald-600">{product.price.toLocaleString()} ₸</span>
              </div>
            </motion.div>
          ))}

          {/* Mobile Total */}
          <div className="bg-white rounded-xl p-4 shadow-sm border-t-2 border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Итого: {totalQty} шт.</span>
              <span className="text-sm font-bold text-gray-900">{totalCost.toLocaleString()} ₸</span>
            </div>
          </div>
        </div>

        {/* Products Table - Desktop */}
        <motion.div variants={itemVariants} className="hidden lg:block bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Товар</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Остаток</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">В пути</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Себест. общ.</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Цена общ.</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Склад</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <p className="font-medium text-sm text-gray-900">{product.name}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-gray-900">
                      {product.qty} шт
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {product.inTransit > 0 ? (
                      <span className="text-sm font-medium text-purple-600">
                        {product.inTransit} шт
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600">{(product.costPrice * product.qty).toLocaleString()} ₸</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-emerald-600">{(product.price * product.qty).toLocaleString()} ₸</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {getWarehouseName(product.warehouse)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-start gap-1">
                      <button
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors group cursor-pointer"
                        title="Переместить"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group cursor-pointer"
                        title="Списать"
                      >
                        <Minus className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors group cursor-pointer"
                        title="Добавить"
                      >
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold text-gray-700">Итого:</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold text-gray-900">{totalQty} шт</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold text-purple-600">{totalInTransit} шт</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-bold text-gray-900">{totalCost.toLocaleString()} ₸</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-bold text-emerald-600">{totalPrice.toLocaleString()} ₸</span>
                </td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6"></td>
              </tr>
            </tfoot>
          </table>
        </motion.div>
      </motion.div>

      {/* Модальное окно создания заказа */}
      <CreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        onCreateOrder={(order) => {
          console.log('Создан заказ:', order);
          setShowCreateOrderModal(false);
        }}
      />
    </div>
  );
}
