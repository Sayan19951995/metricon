'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  Edit,
  X,
  ChevronUp,
  ChevronDown,
  Settings,
  Info,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

// Комиссии Kaspi по категориям (%)
// Источник: https://guide.kaspi.kz/partner/ru/shop/conditions/commissions
const categoryCommissions: Record<string, number> = {
  'Смартфоны': 15.5,
  'Телефоны и гаджеты': 15.5,
  'Ноутбуки': 12.5,
  'Компьютеры': 12.5,
  'Планшеты': 12.5,
  'ТВ, Аудио, Видео': 15.5,
  'Бытовая техника': 12.5,
  'Аксессуары': 15.5,
  'Часы': 15.5,
  'Украшения': 15.5,
  'Одежда': 12.5,
  'Обувь': 12.5,
  'Красота и здоровье': 12.5,
  'Детские товары': 12.5,
  'Спорт, туризм': 12.5,
  'Автотовары': 12.5,
  'Товары для дома и дачи': 12.5,
  'Мебель': 12.5,
  'Строительство, ремонт': 12.5,
  'Канцелярские товары': 12.5,
  'Досуг, книги': 12.5,
  'Подарки, товары для праздников': 12.5,
  'Продукты питания': 7.3,
  'Аптека': 12.5,
  'Товары для животных': 12.5,
};

// Получить комиссию по категории (по умолчанию 12.5%)
const getCategoryCommission = (category: string): number => {
  return categoryCommissions[category] ?? 12.5;
};

// Настройки расчёта себестоимости (в будущем будут на странице настроек)
const costSettings = {
  tax: 4, // % налог
  deliveryType: 'city' as 'city' | 'kazakhstan' | 'express', // тип доставки
};

// Тарифы доставки Kaspi (без НДС, с 1 января 2026)
// Источник: https://guide.kaspi.kz/partner/ru/shop/delivery/shipping/q2288
const deliveryRates = {
  // Заказы до 10,000 ₸ - одинаковые для всех типов
  lowPrice: [
    { max: 1000, rate: 49 },
    { max: 3000, rate: 149 },
    { max: 5000, rate: 199 },
    { max: 10000, rate: 699 },
  ],
  // Заказы свыше 10,000 ₸ - по весу
  byWeight: {
    city: [
      { max: 5, rate: 1099 },
      { max: 15, rate: 1349 },
      { max: 30, rate: 2299 },
      { max: 60, rate: 2899 },
      { max: 100, rate: 4149 },
      { max: Infinity, rate: 6449 },
    ],
    kazakhstan: [
      { max: 5, rate: 1299 },
      { max: 15, rate: 1699 },
      { max: 30, rate: 3599 },
      { max: 60, rate: 5649 },
      { max: 100, rate: 8549 },
      { max: Infinity, rate: 11999 },
    ],
    express: [
      { max: 5, rate: 1699 },
      { max: 15, rate: 1849 },
      { max: 30, rate: 3149 },
      { max: 60, rate: 3599 },
      { max: 100, rate: 5599 },
      { max: Infinity, rate: 8449 },
    ],
  },
};

// Расчёт стоимости доставки по тарифам Kaspi
const calculateDeliveryCost = (weight: number, price: number, type: 'city' | 'kazakhstan' | 'express' = 'city'): number => {
  // Для заказов до 10,000 ₸ - фиксированная ставка по цене (одинаковая для всех типов)
  if (price < 10000) {
    for (const tier of deliveryRates.lowPrice) {
      if (price < tier.max) return tier.rate;
    }
    return deliveryRates.lowPrice[deliveryRates.lowPrice.length - 1].rate;
  }

  // Для заказов свыше 10,000 ₸ - по весу
  const rates = deliveryRates.byWeight[type];
  for (const tier of rates) {
    if (weight <= tier.max) return tier.rate;
  }
  return rates[rates.length - 1].rate;
};

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived' | 'preorder'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'costPrice' | 'profit' | 'preorder' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editPreorder, setEditPreorder] = useState('');
  const [editWeight, setEditWeight] = useState('');

  // Примерные данные товаров (costPrice - закупочная цена со склада, weight - вес в кг, может быть null)
  // Цены установлены для маржинальности ~20-30%
  // weight: null означает что вес не импортирован из Kaspi
  const [products] = useState([
    { id: 1, name: 'iPhone 14 Pro 256GB Deep Purple', sku: 'IP14-256-DP', price: 875000, costPrice: 485000, weight: 0.24 as number | null, stock: 12, category: 'Смартфоны', status: 'active', image: '📱', preorder: null },
    { id: 2, name: 'MacBook Air M2 13" 256GB Midnight', sku: 'MBA-M2-256-MN', price: 985000, costPrice: 605000, weight: 1.24 as number | null, stock: 8, category: 'Ноутбуки', status: 'active', image: '💻', preorder: 3 },
    { id: 3, name: 'AirPods Pro 2nd Generation', sku: 'APP-2GEN', price: 215000, costPrice: 118000, weight: null as number | null, stock: 25, category: 'Аксессуары', status: 'active', image: '🎧', preorder: null },
    { id: 4, name: 'Apple Watch Series 9 45mm GPS', sku: 'AWS9-45-GPS', price: 355000, costPrice: 195000, weight: null as number | null, stock: 15, category: 'Часы', status: 'active', image: '⌚', preorder: 2 },
    { id: 5, name: 'iPad Air 5th Gen 64GB Wi-Fi', sku: 'IPA5-64-WF', price: 465000, costPrice: 275000, weight: 0.46 as number | null, stock: 6, category: 'Планшеты', status: 'active', image: '📱', preorder: 5 },
    { id: 6, name: 'Magic Keyboard для iPad Pro', sku: 'MK-IPP', price: 285000, costPrice: 155000, weight: 0.68 as number | null, stock: 4, category: 'Аксессуары', status: 'active', image: '⌨️', preorder: null },
    { id: 7, name: 'iPhone 13 128GB Midnight', sku: 'IP13-128-MN', price: 659000, costPrice: 365000, weight: null as number | null, stock: 0, category: 'Смартфоны', status: 'archived', image: '📱', preorder: null },
    { id: 8, name: 'AirPods 2nd Generation', sku: 'AP-2GEN', price: 125000, costPrice: 68000, weight: 0.04 as number | null, stock: 35, category: 'Аксессуары', status: 'active', image: '🎧', preorder: 7 },
  ]);

  // Расчёт полной себестоимости: закупка + комиссия (по категории) + налог + доставка (по весу)
  // Если вес не указан, используем минимальный тариф (до 5 кг)
  const calculateFullCost = (price: number, costPrice: number, weight: number | null, category: string) => {
    const commissionRate = getCategoryCommission(category);
    const commission = price * (commissionRate / 100);
    const tax = price * (costSettings.tax / 100);
    // Если вес не указан - используем 0 (минимальный тариф до 5 кг)
    const delivery = calculateDeliveryCost(weight ?? 0, price, costSettings.deliveryType);
    return costPrice + commission + tax + delivery;
  };

  // Расчёт прибыли: Цена - Полная себестоимость
  const calculateProfit = (price: number, costPrice: number, weight: number | null, category: string) => {
    const fullCost = calculateFullCost(price, costPrice, weight, category);
    return Math.round(price - fullCost);
  };

  // Маржинальность в %
  const calculateMargin = (price: number, costPrice: number, weight: number | null, category: string) => {
    const profit = calculateProfit(price, costPrice, weight, category);
    return ((profit / price) * 100).toFixed(1);
  };

  // Получаем уникальные категории
  const categories = [...new Set(products.map(p => p.category))];

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' ||
                           (filterStatus === 'active' && p.status === 'active') ||
                           (filterStatus === 'archived' && p.status === 'archived') ||
                           (filterStatus === 'preorder' && p.preorder && p.preorder > 0);
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'price') return (a.price - b.price) * dir;
      if (sortBy === 'costPrice') return (a.costPrice - b.costPrice) * dir;
      if (sortBy === 'profit') return (calculateProfit(a.price, a.costPrice, a.weight, a.category) - calculateProfit(b.price, b.costPrice, b.weight, b.category)) * dir;
      if (sortBy === 'preorder') return ((a.preorder || 0) - (b.preorder || 0)) * dir;
      if (sortBy === 'status') return a.status.localeCompare(b.status) * dir;
      return 0;
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-1" />;
  };

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    archived: products.filter(p => p.status === 'archived').length,
    preorder: products.filter(p => p.preorder && p.preorder > 0).length,
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setEditPrice(product.price.toString());
    setEditPreorder(product.preorder ? product.preorder.toString() : '');
    setEditWeight(product.weight ? product.weight.toString() : '');
  };

  const handleSave = () => {
    // Здесь будет логика сохранения
    console.log('Сохранение:', { price: editPrice, preorder: editPreorder, weight: editWeight });
    setEditingProduct(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Товары</h1>
          <p className="text-gray-500 text-sm">Управление ассортиментом магазина</p>
        </div>
        <Link
          href="/app/settings/profit"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Настройки расчёта</span>
        </Link>
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
                placeholder="Поиск по названию..."
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
                Все ({stats.total})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterStatus === 'active'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                В продаже ({stats.active})
              </button>
              <button
                onClick={() => setFilterStatus('archived')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterStatus === 'archived'
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Архив ({stats.archived})
              </button>
              <button
                onClick={() => setFilterStatus('preorder')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterStatus === 'preorder'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Предзаказ ({stats.preorder})
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap hidden sm:inline">Категория:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-300 cursor-pointer flex-1 sm:flex-none"
              >
                <option value="all">Все</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
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
                <p className="text-xs text-gray-400 truncate">{product.category}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-sm font-semibold">{product.price.toLocaleString()} ₸</span>
                  {(() => {
                    const profit = calculateProfit(product.price, product.costPrice, product.weight, product.category);
                    const isPositive = profit > 0;
                    return (
                      <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{profit.toLocaleString()} ₸
                      </span>
                    );
                  })()}
                  {product.weight === null && (
                    <div className="relative group">
                      <span className="flex items-center gap-0.5 text-amber-500 cursor-help">
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
                        Вес не указан
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    product.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {product.status === 'active' ? 'Активный' : 'Архив'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleEdit(product)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Products Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Товар<SortIcon column="name" />
              </th>
              <th
                onClick={() => handleSort('price')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Цена<SortIcon column="price" />
              </th>
              <th
                onClick={() => handleSort('costPrice')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                <span className="flex items-center gap-1">
                  Себестоимость<SortIcon column="costPrice" />
                  <div
                    className="relative group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 normal-case font-normal shadow-lg">
                      <div className="font-medium mb-1">Учтено в себестоимости:</div>
                      <ul className="space-y-0.5">
                        <li>• Закупочная стоимость</li>
                        <li>• Комиссия Kaspi (по категории)</li>
                        <li>• Налог ({costSettings.tax}%)</li>
                        <li>• Доставка Kaspi (по весу товара)</li>
                      </ul>
                      <div className="absolute left-3 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                    </div>
                  </div>
                </span>
              </th>
              <th
                onClick={() => handleSort('profit')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                <span className="flex items-center gap-1">
                  Прибыль<SortIcon column="profit" />
                </span>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none"
              >
                Статус<SortIcon column="status" />
              </th>
              <th className="py-4 px-6"></th>
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
                      <p className="text-xs text-gray-400">{product.category}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold">{product.price.toLocaleString()} ₸</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-gray-600">{Math.round(calculateFullCost(product.price, product.costPrice, product.weight, product.category)).toLocaleString()} ₸</span>
                </td>
                <td className="py-4 px-6">
                  {(() => {
                    const profit = calculateProfit(product.price, product.costPrice, product.weight, product.category);
                    const margin = calculateMargin(product.price, product.costPrice, product.weight, product.category);
                    const isPositive = profit > 0;
                    return (
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{profit.toLocaleString()} ₸
                          </span>
                          <span className={`text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {margin}%
                          </span>
                        </div>
                        {product.weight === null && (
                          <div className="relative group">
                            <span className="text-amber-500 cursor-help">
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                            <div className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
                              <div className="font-medium mb-1">Вес не указан</div>
                              <div className="text-gray-300 text-[11px]">Используется мин. тариф доставки (до 5 кг)</div>
                              <div className="absolute left-3 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block w-fit ${
                      product.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {product.status === 'active' ? 'Активный' : 'Архив'}
                    </span>
                    {product.preorder && product.preorder > 0 && (
                      <span className="text-xs text-gray-500">
                        Предзаказ: {product.preorder} {product.preorder === 1 ? 'день' : product.preorder < 5 ? 'дня' : 'дней'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Profit Calculation Note */}
      <div className="mt-4 text-xs text-gray-500 px-2">
        <div className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          <span>Прибыль = Цена − Себестоимость (закуп + комиссия по категории + налог {costSettings.tax}% + доставка по весу). Без учёта рекламы.</span>
        </div>
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
                  <p className="text-xs text-gray-400">{editingProduct.category}</p>
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

              {/* Weight Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Вес (кг)
                </label>
                <input
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Например: 0.24"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Используется для расчёта стоимости доставки Kaspi
                </p>
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
