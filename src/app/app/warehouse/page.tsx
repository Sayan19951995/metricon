'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Settings, ArrowRightLeft, Minus, Plus, Truck, AlertTriangle, History, HelpCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import CreateOrderModal from '@/components/warehouse/CreateOrderModal';
import { useWarehouseProducts } from '@/hooks/useWarehouseProducts';

type WarehouseTab = 'all' | 'almaty' | 'astana' | 'karaganda' | 'shymkent';

export default function WarehousePage() {
  // Получаем товары из хука с localStorage
  const {
    products: warehouseProducts,
    isLoaded,
    syncWithKaspi,
    getStockDiff,
    getProductsWithDiff,
    fetchKaspiStock
  } = useWarehouseProducts();
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState<WarehouseTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  // Для независимых тултипов: null = закрыто, 'header' = в шапке, 'table' = в заголовке таблицы, или id товара
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  // ID товара который сейчас синхронизируется
  const [syncingProductId, setSyncingProductId] = useState<number | null>(null);

  // Синхронизация товара с Kaspi
  const handleSyncProduct = async (productId: number) => {
    setSyncingProductId(productId);
    try {
      await syncWithKaspi(productId);
    } finally {
      setSyncingProductId(null);
    }
  };

  // Закрытие тултипа при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Если клик не по кнопке тултипа - закрываем
      if (!target.closest('[data-tooltip-trigger]')) {
        setActiveTooltip(null);
      }
    };

    if (activeTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeTooltip]);

  const toggleTooltip = (id: string) => {
    setActiveTooltip(prev => prev === id ? null : id);
  };

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

  // Товары с расхождениями Kaspi
  const productsWithDiff = getProductsWithDiff();
  const diffCount = productsWithDiff.length;

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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Склад</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Остатки товаров на складах</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/warehouse/history"
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">История приёмок</span>
          </Link>
          <Link
            href="/app/warehouse/settings"
            className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
            title="Настройки складов"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Stats Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 items-stretch">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm relative h-full">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 leading-tight">Себестоимость</p>
                <button
                  data-tooltip-trigger
                  onClick={() => toggleTooltip('header')}
                  className="flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm lg:text-base font-bold text-gray-900 dark:text-white">{totalCost.toLocaleString()} ₸</p>
            </div>
          </div>
          {/* Tooltip */}
          <AnimatePresence>
            {activeTooltip === 'header' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2.5 rounded-lg shadow-lg"
              >
                <p className="font-medium mb-1">Себестоимость включает:</p>
                <ul className="space-y-0.5 text-gray-300">
                  <li>• Закупочная цена товара</li>
                  <li>• Доставка до склада</li>
                  <li>• Таможенные расходы</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm relative h-full">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 leading-tight">Оценоч. стоимость</p>
                <button
                  data-tooltip-trigger
                  onClick={() => toggleTooltip('estimated')}
                  className="flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm lg:text-base font-bold text-emerald-600">{totalPrice.toLocaleString()} ₸</p>
            </div>
          </div>
          <AnimatePresence>
            {activeTooltip === 'estimated' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2.5 rounded-lg shadow-lg"
              >
                <p className="font-medium mb-1">Оценочная стоимость:</p>
                <ul className="space-y-0.5 text-gray-300">
                  <li>• Сумма розничных цен товаров</li>
                  <li>• Потенциальная выручка при продаже</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative h-full">
          <button
            onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            className={`w-full h-full bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm text-left transition-all cursor-pointer ${
              showCriticalOnly ? 'ring-2 ring-amber-500' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 leading-tight">Критич. остаток</p>
                  <span
                    data-tooltip-trigger
                    onClick={(e) => { e.stopPropagation(); toggleTooltip('critical'); }}
                    className="flex items-center justify-center text-gray-400 hover:text-amber-500 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className="text-sm lg:text-base font-bold text-amber-600">{criticalCount} товаров</p>
              </div>
            </div>
          </button>
          <AnimatePresence>
            {activeTooltip === 'critical' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2.5 rounded-lg shadow-lg"
              >
                <p className="font-medium mb-1">Критический остаток:</p>
                <ul className="space-y-0.5 text-gray-300">
                  <li>• Товары с остатком менее 10 шт</li>
                  <li>• Нажмите для фильтрации</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative h-full">
          <Link
            href="/app/warehouse/history"
            className="bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer block h-full"
          >
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 leading-tight">В пути</p>
                  <span
                    data-tooltip-trigger
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTooltip('transit'); }}
                    className="flex items-center justify-center text-gray-400 hover:text-purple-500 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className="text-sm lg:text-base font-bold text-purple-600">{totalInTransit} шт</p>
              </div>
            </div>
          </Link>
          <AnimatePresence>
            {activeTooltip === 'transit' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2.5 rounded-lg shadow-lg"
              >
                <p className="font-medium mb-1">В пути:</p>
                <ul className="space-y-0.5 text-gray-300">
                  <li>• Товары в доставке на склад</li>
                  <li>• Нажмите для просмотра истории</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Kaspi Sync Status - отдельный ряд на мобильном, в общем ряду на десктопе */}
        <div className="relative h-full col-span-2 lg:col-span-4">
          <div className={`w-full h-full bg-white dark:bg-gray-800 rounded-xl p-3 lg:p-4 shadow-sm transition-all ${
            diffCount > 0 ? 'ring-2 ring-red-400' : ''
          }`}>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0 ${
                diffCount > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'
              }`}>
                <RefreshCw className={`w-4 h-4 lg:w-5 lg:h-5 ${diffCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 leading-tight">Синхронизация с Kaspi</p>
                  <span
                    data-tooltip-trigger
                    onClick={() => toggleTooltip('kaspi-sync')}
                    className="flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className={`text-sm lg:text-base font-bold ${diffCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {diffCount > 0 ? `${diffCount} товаров с расхождением` : 'Все остатки синхронизированы'}
                </p>
              </div>
              {diffCount > 0 && (
                <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Нажмите 🔄 у товара для синхронизации</span>
                </div>
              )}
            </div>
          </div>
          <AnimatePresence>
            {activeTooltip === 'kaspi-sync' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2.5 rounded-lg shadow-lg"
              >
                <p className="font-medium mb-1">Синхронизация с Kaspi:</p>
                <ul className="space-y-0.5 text-gray-300">
                  <li>• Сравниваем остатки через API Kaspi</li>
                  <li>• Расхождения — товары где наш остаток ≠ Kaspi</li>
                  <li>• Нажмите 🔄 чтобы обновить Kaspi</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
                placeholder="Поиск по названию или артикулу..."
                style={{ paddingLeft: '2.5rem' }}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 transition-colors dark:text-white dark:placeholder-gray-500"
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
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Все склады <span className={`text-xs ${activeTab === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>{warehouseCounts.all}</span>
          </button>
          <button
            onClick={() => setActiveTab('almaty')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'almaty'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Алматы <span className={`text-xs ${activeTab === 'almaty' ? 'text-blue-200' : 'text-gray-400'}`}>{warehouseCounts.almaty}</span>
          </button>
          <button
            onClick={() => setActiveTab('astana')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'astana'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Астана <span className={`text-xs ${activeTab === 'astana' ? 'text-purple-200' : 'text-gray-400'}`}>{warehouseCounts.astana}</span>
          </button>
          <button
            onClick={() => setActiveTab('karaganda')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'karaganda'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Караганда <span className={`text-xs ${activeTab === 'karaganda' ? 'text-orange-200' : 'text-gray-400'}`}>{warehouseCounts.karaganda}</span>
          </button>
          <button
            onClick={() => setActiveTab('shymkent')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'shymkent'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Шымкент <span className={`text-xs ${activeTab === 'shymkent' ? 'text-emerald-200' : 'text-gray-400'}`}>{warehouseCounts.shymkent}</span>
          </button>
        </div>
      </div>

      <div>
        {/* Products - Mobile Cards */}
        <div className="lg:hidden space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate dark:text-white">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{product.sku}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  {(() => {
                    const diff = getStockDiff(product);
                    if (diff !== null && diff !== 0) {
                      return (
                        <>
                          <div className="relative">
                            <button
                              data-tooltip-trigger
                              onClick={() => toggleTooltip(`sync-${product.id}`)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                                diff > 0
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {diff > 0 ? `+${diff}` : diff}
                            </button>
                            <AnimatePresence>
                              {activeTooltip === `sync-${product.id}` && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="absolute right-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-lg w-48"
                                >
                                  <p className="font-medium mb-1">Расхождение с Kaspi</p>
                                  <div className="space-y-0.5 text-gray-300">
                                    <p>У нас: {product.qty} шт</p>
                                    <p>В Kaspi: {product.kaspiStock} шт</p>
                                    <p className="text-white font-medium mt-1">
                                      {diff > 0
                                        ? `У нас на ${diff} больше`
                                        : `В Kaspi на ${Math.abs(diff)} больше`}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <button
                            onClick={() => handleSyncProduct(product.id)}
                            disabled={syncingProductId === product.id}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Отправить остаток в Kaspi"
                          >
                            <RefreshCw className={`w-4 h-4 ${syncingProductId === product.id ? 'animate-spin' : ''}`} />
                          </button>
                        </>
                      );
                    }
                    return null;
                  })()}
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {getWarehouseName(product.warehouse)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900 dark:text-white">{product.qty} шт</span>
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-0.5 relative">
                      <span className="text-[10px] opacity-60">себ.</span>
                      <button
                        data-tooltip-trigger
                        onClick={() => toggleTooltip(`cost-${product.id}`)}
                        className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                      </button>
                      <AnimatePresence>
                        {activeTooltip === `cost-${product.id}` && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute left-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-lg w-40"
                          >
                            <p className="font-medium mb-1">Себестоимость включает:</p>
                            <ul className="space-y-0.5 text-gray-300">
                              <li>• Закупочная цена</li>
                              <li>• Доставка до склада</li>
                              <li>• Таможенные расходы</li>
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <span>{product.costPrice.toLocaleString()} ₸</span>
                    </span>
                </div>
                <span className="text-emerald-600"><span className="text-[10px] opacity-60 font-normal">сумма</span> <span className="font-semibold">{product.price.toLocaleString()} ₸</span></span>
              </div>
            </div>
          ))}

          {/* Mobile Total */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Итого: {totalQty} шт.</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{totalCost.toLocaleString()} ₸</span>
            </div>
          </div>
        </div>

        {/* Products Table - Desktop */}
        <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Товар</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Остаток</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">В пути</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  <div className="flex items-center gap-1 relative">
                    <span>Себест. общ.</span>
                    <button
                      data-tooltip-trigger
                      onClick={() => toggleTooltip('table')}
                      className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                    <AnimatePresence>
                      {activeTooltip === 'table' && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-lg w-48 normal-case font-normal"
                        >
                          <p className="font-medium mb-1">Себестоимость включает:</p>
                          <ul className="space-y-0.5 text-gray-300">
                            <li>• Закупочная цена товара</li>
                            <li>• Доставка до склада</li>
                            <li>• Таможенные расходы</li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Цена общ.</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Склад</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{product.name}</p>
                      {(() => {
                        const diff = getStockDiff(product);
                        if (diff !== null && diff !== 0) {
                          return (
                            <div className="relative">
                              <button
                                data-tooltip-trigger
                                onClick={() => toggleTooltip(`table-sync-${product.id}`)}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                                  diff > 0
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                }`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {diff > 0 ? `+${diff}` : diff}
                              </button>
                              <AnimatePresence>
                                {activeTooltip === `table-sync-${product.id}` && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute left-0 top-full mt-1 z-50 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-lg w-48"
                                  >
                                    <p className="font-medium mb-1">Расхождение с Kaspi</p>
                                    <div className="space-y-0.5 text-gray-300">
                                      <p>У нас: {product.qty} шт</p>
                                      <p>В Kaspi: {product.kaspiStock} шт</p>
                                      <p className="text-white font-medium mt-1">
                                        {diff > 0
                                          ? `У нас на ${diff} больше`
                                          : `В Kaspi на ${Math.abs(diff)} больше`}
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {product.qty} шт
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {product.inTransit > 0 ? (
                      <span className="text-sm font-medium text-purple-600">
                        {product.inTransit} шт
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{(product.costPrice * product.qty).toLocaleString()} ₸</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-semibold text-emerald-600">{(product.price * product.qty).toLocaleString()} ₸</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {getWarehouseName(product.warehouse)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-start gap-1">
                      {(() => {
                        const diff = getStockDiff(product);
                        if (diff !== null && diff !== 0) {
                          return (
                            <button
                              onClick={() => handleSyncProduct(product.id)}
                              disabled={syncingProductId === product.id}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors group cursor-pointer disabled:opacity-50"
                              title="Отправить остаток в Kaspi"
                            >
                              <RefreshCw className={`w-4 h-4 text-red-500 group-hover:text-red-600 ${syncingProductId === product.id ? 'animate-spin' : ''}`} />
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <button
                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors group cursor-pointer"
                        title="Переместить"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors group cursor-pointer"
                        title="Списать"
                      >
                        <Minus className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors group cursor-pointer"
                        title="Добавить"
                      >
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <tr>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Итого:</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{totalQty} шт</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold text-purple-600">{totalInTransit} шт</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{totalCost.toLocaleString()} ₸</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-bold text-emerald-600">{totalPrice.toLocaleString()} ₸</span>
                </td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

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
