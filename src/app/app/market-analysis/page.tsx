'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  ShoppingCart,
  Store,
  Star,
  ExternalLink,
  Filter,
  X,
  Link as LinkIcon,
  Calendar
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type Period = 'week' | 'month' | '3months' | 'year';

// Структура категорий Kaspi
const categoriesData = [
  {
    id: 'smartphones',
    name: 'Смартфоны',
    icon: '📱',
    totalSales: 2450000000,
    totalUnits: 45200,
    avgPrice: 54200,
    sellersCount: 1250,
    growth: 12,
    subcategories: [
      {
        id: 'apple',
        name: 'Apple iPhone',
        totalSales: 980000000,
        totalUnits: 12500,
        avgPrice: 78400,
        sellersCount: 420,
        growth: 18,
        products: [
          { id: 1, name: 'iPhone 15 Pro Max 256GB', sku: '123456789', price: 549990, sales: 2850, revenue: 1567471500, sellers: 156, rating: 4.9, image: '📱' },
          { id: 2, name: 'iPhone 15 Pro 128GB', sku: '123456790', price: 449990, sales: 3200, revenue: 1439968000, sellers: 189, rating: 4.9, image: '📱' },
          { id: 3, name: 'iPhone 14 128GB', sku: '123456791', price: 299990, sales: 4100, revenue: 1229959000, sellers: 245, rating: 4.8, image: '📱' },
        ]
      },
      {
        id: 'samsung',
        name: 'Samsung Galaxy',
        totalSales: 720000000,
        totalUnits: 15800,
        avgPrice: 45569,
        sellersCount: 380,
        growth: 8,
        products: [
          { id: 4, name: 'Samsung Galaxy S24 Ultra 256GB', sku: '223456789', price: 499990, sales: 1950, revenue: 974980500, sellers: 134, rating: 4.8, image: '📱' },
          { id: 5, name: 'Samsung Galaxy S24 128GB', sku: '223456790', price: 349990, sales: 2800, revenue: 979972000, sellers: 178, rating: 4.7, image: '📱' },
        ]
      },
      {
        id: 'xiaomi',
        name: 'Xiaomi',
        totalSales: 450000000,
        totalUnits: 18500,
        avgPrice: 24324,
        sellersCount: 520,
        growth: 22,
        products: []
      },
    ]
  },
  {
    id: 'laptops',
    name: 'Ноутбуки',
    icon: '💻',
    totalSales: 1890000000,
    totalUnits: 18700,
    avgPrice: 101069,
    sellersCount: 680,
    growth: 5,
    subcategories: [
      {
        id: 'macbook',
        name: 'Apple MacBook',
        totalSales: 680000000,
        totalUnits: 4200,
        avgPrice: 161904,
        sellersCount: 145,
        growth: 15,
        products: []
      },
      {
        id: 'gaming',
        name: 'Игровые ноутбуки',
        totalSales: 520000000,
        totalUnits: 5800,
        avgPrice: 89655,
        sellersCount: 210,
        growth: -2,
        products: []
      },
    ]
  },
  {
    id: 'headphones',
    name: 'Наушники',
    icon: '🎧',
    totalSales: 580000000,
    totalUnits: 125000,
    avgPrice: 4640,
    sellersCount: 890,
    growth: 28,
    subcategories: [
      {
        id: 'airpods',
        name: 'Apple AirPods',
        totalSales: 185000000,
        totalUnits: 22000,
        avgPrice: 8409,
        sellersCount: 320,
        growth: 35,
        products: []
      },
      {
        id: 'tws',
        name: 'TWS наушники',
        totalSales: 280000000,
        totalUnits: 78000,
        avgPrice: 3589,
        sellersCount: 560,
        growth: 42,
        products: []
      },
    ]
  },
  {
    id: 'watches',
    name: 'Умные часы',
    icon: '⌚',
    totalSales: 420000000,
    totalUnits: 52000,
    avgPrice: 8076,
    sellersCount: 450,
    growth: 18,
    subcategories: []
  },
  {
    id: 'tablets',
    name: 'Планшеты',
    icon: '📟',
    totalSales: 380000000,
    totalUnits: 12500,
    avgPrice: 30400,
    sellersCount: 280,
    growth: -5,
    subcategories: []
  },
  {
    id: 'accessories',
    name: 'Аксессуары',
    icon: '🔌',
    totalSales: 890000000,
    totalUnits: 580000,
    avgPrice: 1534,
    sellersCount: 2100,
    growth: 15,
    subcategories: []
  },
];

// Данные для графика тренда продаж
const salesTrendData = [
  { date: '01.01', sales: 125000000, units: 2800 },
  { date: '02.01', sales: 132000000, units: 2950 },
  { date: '03.01', sales: 118000000, units: 2650 },
  { date: '04.01', sales: 145000000, units: 3200 },
  { date: '05.01', sales: 156000000, units: 3450 },
  { date: '06.01', sales: 142000000, units: 3150 },
  { date: '07.01', sales: 168000000, units: 3700 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

export default function MarketAnalysisPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'text' | 'link' | 'sku'>('text');
  const [period, setPeriod] = useState<Period>('month');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setExpandedSubcategories(prev =>
      prev.includes(subcategoryId)
        ? prev.filter(id => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)} млрд ₸`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} млн ₸`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K ₸`;
    }
    return `${value.toLocaleString()} ₸`;
  };

  const formatUnits = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Анализ рынка Kaspi</h1>
              <p className="text-gray-500 mt-1 text-sm">Статистика продаж, категории и товары маркетплейса</p>
            </div>
            <a
              href="https://kaspi.kz/shop"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#f14635] text-white rounded-xl hover:bg-[#d93d2e] transition-colors cursor-pointer text-sm sm:text-base"
            >
              <ExternalLink className="w-4 h-4" />
              Kaspi.kz
            </a>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Search Type Toggle & Period - Mobile row */}
              <div className="flex gap-2 sm:gap-3">
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setSearchType('text')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      searchType === 'text' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSearchType('link')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      searchType === 'link' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSearchType('sku')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      searchType === 'sku' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    SKU
                  </button>
                </div>

                {/* Period Filter - visible on mobile */}
                <div className="flex bg-gray-100 rounded-xl p-1 overflow-x-auto flex-1 sm:flex-none">
                  {(['week', 'month', '3months', 'year'] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        period === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {p === 'week' && '7д'}
                      {p === 'month' && '30д'}
                      {p === '3months' && '90д'}
                      {p === 'year' && '1г'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchType === 'text' ? 'Поиск товара по названию...' :
                    searchType === 'link' ? 'Вставьте ссылку на товар kaspi.kz...' :
                    'Введите артикул товара...'
                  }
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  showFilters ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Фильтры</span>
              </button>
            </div>

            {/* Extended Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 border-t border-gray-100"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Цена от</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Цена до</label>
                      <input
                        type="number"
                        placeholder="1000000"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Продаж от</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Рейтинг от</label>
                      <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm cursor-pointer">
                        <option value="">Любой</option>
                        <option value="4.5">4.5+</option>
                        <option value="4">4+</option>
                        <option value="3.5">3.5+</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Categories List */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Категории маркетплейса</h2>
              </div>

              <div className="divide-y divide-gray-50">
                {categoriesData.map((category) => (
                  <div key={category.id}>
                    {/* Category Row */}
                    <div
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
                        {category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm sm:text-base">{category.name}</span>
                          {category.subcategories.length > 0 && (
                            <span className="text-xs text-gray-400">({category.subcategories.length})</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(category.totalSales)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {formatUnits(category.totalUnits)} шт
                          </span>
                          <span className="hidden sm:flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {category.sellersCount}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${
                          category.growth > 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {category.growth > 0 ? <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          {category.growth > 0 ? '+' : ''}{category.growth}%
                        </div>
                        <div className="text-xs text-gray-400 mt-1 hidden sm:block">за период</div>
                      </div>
                      {category.subcategories.length > 0 && (
                        <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ${
                          expandedCategories.includes(category.id) ? 'rotate-90' : ''
                        }`} />
                      )}
                    </div>

                    {/* Subcategories */}
                    <AnimatePresence>
                      {expandedCategories.includes(category.id) && category.subcategories.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-gray-50"
                        >
                          {category.subcategories.map((sub) => (
                            <div key={sub.id}>
                              <div
                                onClick={() => toggleSubcategory(sub.id)}
                                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 pl-10 sm:pl-16 hover:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-gray-800 text-sm sm:text-base">{sub.name}</span>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-500">
                                    <span>{formatCurrency(sub.totalSales)}</span>
                                    <span>{formatUnits(sub.totalUnits)} шт</span>
                                    <span className="hidden sm:inline">{sub.sellersCount} продавцов</span>
                                  </div>
                                </div>
                                <div className={`text-xs sm:text-sm font-medium flex-shrink-0 ${
                                  sub.growth > 0 ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                  {sub.growth > 0 ? '+' : ''}{sub.growth}%
                                </div>
                                {sub.products.length > 0 && (
                                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                                    expandedSubcategories.includes(sub.id) ? 'rotate-90' : ''
                                  }`} />
                                )}
                              </div>

                              {/* Products */}
                              <AnimatePresence>
                                {expandedSubcategories.includes(sub.id) && sub.products.length > 0 && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-white"
                                  >
                                    {sub.products.map((product) => (
                                      <div
                                        key={product.id}
                                        onClick={() => setSelectedProduct(product)}
                                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 pl-14 sm:pl-24 hover:bg-emerald-50 transition-colors cursor-pointer border-l-2 border-transparent hover:border-emerald-500"
                                      >
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
                                          {product.image}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate text-sm sm:text-base">{product.name}</div>
                                          <div className="text-xs text-gray-400">SKU: {product.sku}</div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <div className="font-medium text-gray-900 text-sm sm:text-base">{product.price.toLocaleString()} ₸</div>
                                          <div className="text-xs text-gray-500 hidden sm:block">{product.sales.toLocaleString()} продаж</div>
                                        </div>
                                        <div className="flex items-center gap-1 text-amber-500 flex-shrink-0">
                                          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400" />
                                          <span className="text-xs sm:text-sm font-medium">{product.rating}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Stats or Product Card */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 sm:space-y-6"
          >
            {/* Market Summary */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Статистика рынка</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Общий оборот</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">6.6 млрд ₸</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Всего продаж</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">833K шт</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Активных продавцов</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">5,650</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Средний чек</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">7,920 ₸</span>
                </div>
              </div>
            </motion.div>

            {/* Sales Trend Chart */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Тренд продаж</h3>
              <ResponsiveContainer width="100%" height={150} className="sm:!h-[180px]">
                <LineChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value) => [`${(Number(value)/1000000).toFixed(1)} млн ₸`, 'Продажи']} />
                  <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Top Categories */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Топ категорий по росту</h3>
              <div className="space-y-2.5 sm:space-y-3">
                {categoriesData
                  .sort((a, b) => b.growth - a.growth)
                  .slice(0, 5)
                  .map((cat, index) => (
                    <div key={cat.id} className="flex items-center gap-2 sm:gap-3">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <span className="text-base sm:text-lg">{cat.icon}</span>
                      <span className="flex-1 text-xs sm:text-sm text-gray-900">{cat.name}</span>
                      <span className={`text-xs sm:text-sm font-medium ${cat.growth > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {cat.growth > 0 ? '+' : ''}{cat.growth}%
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Product Modal */}
        <AnimatePresence>
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
              onClick={() => setSelectedProduct(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 sm:px-6 py-3 sm:py-4 sticky top-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-bold text-white">Карточка товара</h3>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6">
                  {/* Product Info */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0 mx-auto sm:mx-0">
                      {selectedProduct.image}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900">{selectedProduct.name}</h4>
                      <p className="text-gray-500 text-sm">SKU: {selectedProduct.sku}</p>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-4 h-4 fill-amber-400" />
                          <span className="font-medium">{selectedProduct.rating}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500 text-sm">{selectedProduct.sellers} продавцов</span>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{selectedProduct.price.toLocaleString()} ₸</div>
                      <a
                        href={`https://kaspi.kz/shop/p/${selectedProduct.sku}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 hover:underline flex items-center justify-center sm:justify-end gap-1 mt-1"
                      >
                        Открыть на Kaspi <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                      <div className="text-gray-500 text-xs sm:text-sm mb-1">Продажи</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{selectedProduct.sales.toLocaleString()}</div>
                      <div className="text-xs text-emerald-500">за период</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                      <div className="text-gray-500 text-xs sm:text-sm mb-1">Выручка</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(selectedProduct.revenue)}</div>
                      <div className="text-xs text-emerald-500">за период</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                      <div className="text-gray-500 text-xs sm:text-sm mb-1">Продавцов</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{selectedProduct.sellers}</div>
                      <div className="text-xs text-gray-400">активных</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                      <div className="text-gray-500 text-xs sm:text-sm mb-1">Рейтинг</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-1">
                        {selectedProduct.rating}
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      </div>
                      <div className="text-xs text-gray-400">на основе отзывов</div>
                    </div>
                  </div>

                  {/* Sales Trend */}
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <h5 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Динамика продаж</h5>
                    <ResponsiveContainer width="100%" height={120} className="sm:!h-[150px]">
                      <BarChart data={salesTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="units" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
