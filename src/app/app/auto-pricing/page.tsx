'use client';

import { useState } from 'react';
import {
  Search,
  TrendingDown,
  Play,
  Pause,
  Settings,
  ChevronDown,
  Zap,
  Target,
  Shield,
  Clock,
  AlertTriangle,
  History,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// Типы
type Strategy = 'undercut' | 'match' | 'position';

interface Product {
  id: number;
  name: string;
  sku: string;
  image: string;
  currentPrice: number;
  competitorPrice: number;
  competitorName: string;
  position: number;
  // Настройки автоцены (null = выключено)
  autoPricing: {
    enabled: boolean;
    strategy: Strategy;
    minPrice: number;
    maxPrice: number;
    step: number;
    targetPosition?: number;
    status: 'active' | 'paused' | 'error';
    lastUpdate: string;
    priceChanges24h: number;
  } | null;
}

// Mock данные всех товаров
const mockProducts: Product[] = [
  {
    id: 1,
    name: 'iPhone 14 Pro 256GB',
    sku: 'APL-IP14P-256',
    image: '📱',
    currentPrice: 449900,
    competitorPrice: 451900,
    competitorName: 'TechStore KZ',
    position: 2,
    autoPricing: {
      enabled: true,
      strategy: 'undercut',
      minPrice: 420000,
      maxPrice: 480000,
      step: 1000,
      status: 'active',
      lastUpdate: '2025-01-16T10:30:00',
      priceChanges24h: 5,
    },
  },
  {
    id: 2,
    name: 'Samsung Galaxy S24 Ultra',
    sku: 'SAM-S24U-256',
    image: '📱',
    currentPrice: 549900,
    competitorPrice: 545900,
    competitorName: 'Mobile World',
    position: 3,
    autoPricing: {
      enabled: true,
      strategy: 'position',
      minPrice: 500000,
      maxPrice: 580000,
      step: 2000,
      targetPosition: 1,
      status: 'active',
      lastUpdate: '2025-01-16T09:15:00',
      priceChanges24h: 3,
    },
  },
  {
    id: 3,
    name: 'AirPods Pro 2',
    sku: 'APL-APP2',
    image: '🎧',
    currentPrice: 89900,
    competitorPrice: 89900,
    competitorName: 'Apple Store KZ',
    position: 1,
    autoPricing: {
      enabled: true,
      strategy: 'match',
      minPrice: 85000,
      maxPrice: 95000,
      step: 500,
      status: 'paused',
      lastUpdate: '2025-01-15T18:45:00',
      priceChanges24h: 0,
    },
  },
  {
    id: 4,
    name: 'MacBook Pro 14" M3',
    sku: 'APL-MBP14-M3',
    image: '💻',
    currentPrice: 1149900,
    competitorPrice: 1155000,
    competitorName: 'Digital Store',
    position: 1,
    autoPricing: {
      enabled: true,
      strategy: 'undercut',
      minPrice: 1100000,
      maxPrice: 1200000,
      step: 5000,
      status: 'active',
      lastUpdate: '2025-01-16T11:00:00',
      priceChanges24h: 2,
    },
  },
  {
    id: 5,
    name: 'Sony WH-1000XM5',
    sku: 'SNY-WH1000',
    image: '🎧',
    currentPrice: 149900,
    competitorPrice: 148900,
    competitorName: 'AudioPro KZ',
    position: 4,
    autoPricing: {
      enabled: true,
      strategy: 'undercut',
      minPrice: 140000,
      maxPrice: 160000,
      step: 1000,
      status: 'error',
      lastUpdate: '2025-01-16T08:00:00',
      priceChanges24h: 0,
    },
  },
  {
    id: 6,
    name: 'iPad Pro 12.9" M2',
    sku: 'APL-IPADP-129',
    image: '📱',
    currentPrice: 599900,
    competitorPrice: 605000,
    competitorName: 'iStore KZ',
    position: 2,
    autoPricing: null, // Автоцена выключена
  },
  {
    id: 7,
    name: 'Samsung Galaxy Watch 6',
    sku: 'SAM-GW6-44',
    image: '⌚',
    currentPrice: 149900,
    competitorPrice: 152000,
    competitorName: 'Watch World',
    position: 3,
    autoPricing: null,
  },
  {
    id: 8,
    name: 'Apple Watch Ultra 2',
    sku: 'APL-AWU2',
    image: '⌚',
    currentPrice: 449900,
    competitorPrice: 455000,
    competitorName: 'Apple Store KZ',
    position: 2,
    autoPricing: null,
  },
  {
    id: 9,
    name: 'Google Pixel 8 Pro',
    sku: 'GGL-PX8P',
    image: '📱',
    currentPrice: 399900,
    competitorPrice: 405000,
    competitorName: 'TechStore KZ',
    position: 1,
    autoPricing: null,
  },
  {
    id: 10,
    name: 'Sony PlayStation 5',
    sku: 'SNY-PS5',
    image: '🎮',
    currentPrice: 299900,
    competitorPrice: 295000,
    competitorName: 'Game Zone',
    position: 3,
    autoPricing: null,
  },
  {
    id: 11,
    name: 'Xbox Series X',
    sku: 'MS-XSX',
    image: '🎮',
    currentPrice: 279900,
    competitorPrice: 282000,
    competitorName: 'Game Zone',
    position: 1,
    autoPricing: null,
  },
  {
    id: 12,
    name: 'Nintendo Switch OLED',
    sku: 'NTD-SWOLED',
    image: '🎮',
    currentPrice: 179900,
    competitorPrice: 175000,
    competitorName: 'Game World',
    position: 4,
    autoPricing: null,
  },
];

// Стратегии
const strategies: { value: Strategy; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'undercut',
    label: 'Демпинг',
    description: 'Всегда дешевле конкурента',
    icon: <TrendingDown className="w-4 h-4" />
  },
  {
    value: 'match',
    label: 'Паритет',
    description: 'Равная цена с конкурентом',
    icon: <Target className="w-4 h-4" />
  },
  {
    value: 'position',
    label: 'Позиция',
    description: 'Удержание позиции в выдаче',
    icon: <Zap className="w-4 h-4" />
  },
];

const ITEMS_PER_PAGE = 10;

export default function AutoPricingPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Состояние модалки редактирования
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editStrategy, setEditStrategy] = useState<Strategy>('undercut');
  const [editMinPrice, setEditMinPrice] = useState<number>(0);
  const [editMaxPrice, setEditMaxPrice] = useState<number>(0);
  const [editStep, setEditStep] = useState<number>(1000);
  const [editTargetPosition, setEditTargetPosition] = useState<number>(1);

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return date.toLocaleDateString('ru-RU');
  };

  // Включить/выключить автоцену для товара
  const toggleAutoPricing = (productId: number) => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        if (product.autoPricing) {
          // Выключить
          return { ...product, autoPricing: null };
        } else {
          // Включить с дефолтными настройками
          return {
            ...product,
            autoPricing: {
              enabled: true,
              strategy: 'undercut' as Strategy,
              minPrice: Math.round(product.currentPrice * 0.9),
              maxPrice: Math.round(product.currentPrice * 1.1),
              step: 1000,
              status: 'active' as const,
              lastUpdate: new Date().toISOString(),
              priceChanges24h: 0,
            }
          };
        }
      }
      return product;
    }));
  };

  // Поставить на паузу / возобновить
  const togglePause = (productId: number) => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId && product.autoPricing) {
        return {
          ...product,
          autoPricing: {
            ...product.autoPricing,
            status: product.autoPricing.status === 'active' ? 'paused' : 'active'
          }
        };
      }
      return product;
    }));
  };

  // Открыть модалку редактирования
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    if (product.autoPricing) {
      setEditStrategy(product.autoPricing.strategy);
      setEditMinPrice(product.autoPricing.minPrice);
      setEditMaxPrice(product.autoPricing.maxPrice);
      setEditStep(product.autoPricing.step);
      setEditTargetPosition(product.autoPricing.targetPosition || 1);
    } else {
      setEditStrategy('undercut');
      setEditMinPrice(Math.round(product.currentPrice * 0.9));
      setEditMaxPrice(Math.round(product.currentPrice * 1.1));
      setEditStep(1000);
      setEditTargetPosition(1);
    }
  };

  // Сохранить изменения
  const saveSettings = () => {
    if (!editingProduct) return;
    if (editMinPrice >= editMaxPrice) return;

    setProducts(prev => prev.map(product => {
      if (product.id === editingProduct.id) {
        return {
          ...product,
          autoPricing: {
            enabled: true,
            strategy: editStrategy,
            minPrice: editMinPrice,
            maxPrice: editMaxPrice,
            step: editStep,
            targetPosition: editStrategy === 'position' ? editTargetPosition : undefined,
            status: product.autoPricing?.status || 'active',
            lastUpdate: product.autoPricing?.lastUpdate || new Date().toISOString(),
            priceChanges24h: product.autoPricing?.priceChanges24h || 0,
          }
        };
      }
      return product;
    }));

    setEditingProduct(null);
  };

  // Фильтрация товаров
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'enabled' && product.autoPricing !== null) ||
                          (statusFilter === 'disabled' && product.autoPricing === null);
    return matchesSearch && matchesStatus;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Сброс страницы при изменении фильтров
  const handleFilterChange = (filter: 'all' | 'enabled' | 'disabled') => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Статистика
  const stats = {
    total: products.length,
    enabled: products.filter(p => p.autoPricing !== null).length,
    active: products.filter(p => p.autoPricing?.status === 'active').length,
    errors: products.filter(p => p.autoPricing?.status === 'error').length,
    firstPlace: products.filter(p => p.position === 1).length,
    changesTotal: products.reduce((sum, p) => sum + (p.autoPricing?.priceChanges24h || 0), 0),
  };

  // Получить иконку стратегии
  const getStrategyIcon = (strategy: Strategy) => {
    const s = strategies.find(st => st.value === strategy);
    return s?.icon;
  };

  // Получить название стратегии
  const getStrategyLabel = (strategy: Strategy) => {
    const s = strategies.find(st => st.value === strategy);
    return s?.label || strategy;
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Автоцена</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mt-1 hidden sm:block">Автоматическое управление ценами для конкуренции на Kaspi</p>
        </div>
        <a
          href="/app/auto-pricing/history"
          className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-xs sm:text-sm flex items-center gap-2 w-fit"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">История изменений</span>
          <span className="sm:hidden">История</span>
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Всего</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Вкл.</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-600">
            {stats.enabled}<span className="text-xs sm:text-base font-normal text-gray-400 dark:text-gray-500">/{stats.total}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">24ч</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-amber-600">{stats.changesTotal}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Ошибки</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.errors}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">На 1 месте</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-purple-600">
            {stats.firstPlace}<span className="text-xs sm:text-base font-normal text-gray-400 dark:text-gray-500">/{stats.total}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm mb-4 sm:mb-6">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 sm:pl-11 pr-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'all' ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Все ({stats.total})
            </button>
            <button
              onClick={() => handleFilterChange('enabled')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                statusFilter === 'enabled' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">Включено</span> ({stats.enabled})
            </button>
            <button
              onClick={() => handleFilterChange('disabled')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'disabled' ? 'bg-gray-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="hidden sm:inline">Выключено</span><span className="sm:hidden">Выкл</span> ({stats.total - stats.enabled})
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        {paginatedProducts.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Товаров не найдено</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {paginatedProducts.map(product => (
              <div
                key={product.id}
                className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${product.autoPricing?.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
              >
                {/* Mobile Layout */}
                <div className="sm:hidden">
                  <div className="flex items-start gap-3">
                    {/* Toggle - smaller on mobile */}
                    <button
                      onClick={() => toggleAutoPricing(product.id)}
                      className="flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95 mt-0.5"
                      title={product.autoPricing ? 'Выключить автоцену' : 'Включить автоцену'}
                    >
                      {product.autoPricing ? (
                        <ToggleRight className="w-7 h-7 text-emerald-500 transition-colors duration-300" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-gray-300 hover:text-gray-400 transition-colors duration-300" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Product name and status */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</span>
                        {product.autoPricing && (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            product.autoPricing.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            product.autoPricing.status === 'paused' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {product.autoPricing.status === 'active' ? <Play className="w-2.5 h-2.5" /> :
                             product.autoPricing.status === 'paused' ? <Pause className="w-2.5 h-2.5" /> :
                             <AlertTriangle className="w-2.5 h-2.5" />}
                            {product.autoPricing.status === 'active' ? 'Акт' :
                             product.autoPricing.status === 'paused' ? 'Пауза' : 'Ошиб'}
                          </span>
                        )}
                      </div>

                      {/* Price and position row */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {product.currentPrice.toLocaleString('ru-RU')} ₸
                        </span>
                        <span className={`text-sm font-bold ${product.position === 1 ? 'text-emerald-600' : product.position <= 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                          #{product.position}
                        </span>
                      </div>

                      {/* Strategy and SKU */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {product.autoPricing && (
                          <span className="flex items-center gap-0.5">
                            {getStrategyIcon(product.autoPricing.strategy)}
                            {getStrategyLabel(product.autoPricing.strategy)}
                          </span>
                        )}
                        <span className="font-mono text-[10px]">{product.sku}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {product.autoPricing && (
                        <button
                          onClick={() => togglePause(product.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            product.autoPricing.status === 'active'
                              ? 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-600'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-600'
                          }`}
                        >
                          {product.autoPricing.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Error Message Mobile */}
                  {product.autoPricing?.status === 'error' && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-start gap-1.5 text-xs text-red-700 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Достигнут минимальный порог</span>
                    </div>
                  )}
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:block">
                  <div className="flex items-center gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleAutoPricing(product.id)}
                      className="flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
                      title={product.autoPricing ? 'Выключить автоцену' : 'Включить автоцену'}
                    >
                      {product.autoPricing ? (
                        <ToggleRight className="w-8 h-8 text-emerald-500 transition-colors duration-300" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-300 hover:text-gray-400 transition-colors duration-300" />
                      )}
                    </button>

                    {/* Product Info */}
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {product.image}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                        {product.autoPricing && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            product.autoPricing.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            product.autoPricing.status === 'paused' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {product.autoPricing.status === 'active' ? <Play className="w-3 h-3" /> :
                             product.autoPricing.status === 'paused' ? <Pause className="w-3 h-3" /> :
                             <AlertTriangle className="w-3 h-3" />}
                            {product.autoPricing.status === 'active' ? 'Активно' :
                             product.autoPricing.status === 'paused' ? 'На паузе' : 'Ошибка'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{product.sku}</span>
                        {product.autoPricing && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {getStrategyIcon(product.autoPricing.strategy)}
                              {getStrategyLabel(product.autoPricing.strategy)}
                            </span>
                            <span className="hidden lg:inline">•</span>
                            <span className="hidden lg:inline">Обновлено {formatDate(product.autoPricing.lastUpdate)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="text-right">
                      <div className="text-base font-bold text-gray-900 dark:text-white">
                        {product.currentPrice.toLocaleString('ru-RU')} ₸
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">
                        Конкурент: {product.competitorPrice.toLocaleString('ru-RU')} ₸
                      </div>
                    </div>

                    {/* Position */}
                    <div className="w-14 text-center">
                      <div className={`text-base font-bold ${product.position === 1 ? 'text-emerald-600' : product.position <= 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                        #{product.position}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">позиция</div>
                    </div>

                    {/* Price Range (only if enabled) - hidden on tablets */}
                    <div className="hidden lg:block">
                      {product.autoPricing ? (
                        <div className="w-24">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                            <span>{(product.autoPricing.minPrice / 1000).toFixed(0)}к</span>
                            <span>{(product.autoPricing.maxPrice / 1000).toFixed(0)}к</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${((product.currentPrice - product.autoPricing.minPrice) / (product.autoPricing.maxPrice - product.autoPricing.minPrice)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="w-24 text-center text-xs text-gray-400 dark:text-gray-500">—</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {product.autoPricing && (
                        <button
                          onClick={() => togglePause(product.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            product.autoPricing.status === 'active'
                              ? 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-600'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-600'
                          }`}
                          title={product.autoPricing.status === 'active' ? 'Приостановить' : 'Запустить'}
                        >
                          {product.autoPricing.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(product)}
                        className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg transition-colors cursor-pointer"
                        title="Настройки"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Error Message Desktop */}
                  {product.autoPricing?.status === 'error' && (
                    <div className="mt-3 p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Не удалось обновить цену: достигнут минимальный порог. Конкурент: {product.competitorName} ({product.competitorPrice.toLocaleString('ru-RU')} ₸)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} из {filteredProducts.length}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    page === currentPage
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Block */}
      <div className="mt-4 sm:mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">Как работает автоцена?</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 hidden sm:block">
              Включите автоцену для товара, и система будет автоматически корректировать цены в пределах заданного диапазона.
            </p>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                <span><strong>Демпинг</strong><span className="hidden sm:inline"> — дешевле</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                <span><strong>Паритет</strong><span className="hidden sm:inline"> — равная</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                <span><strong>Позиция</strong><span className="hidden sm:inline"> — удержание</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Настройки автоцены</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{editingProduct.name}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer ml-2"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Strategy */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Стратегия
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {strategies.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setEditStrategy(s.value)}
                      className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-colors text-left cursor-pointer ${
                        editStrategy === s.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                        {s.icon}
                        <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{s.label}</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{s.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Position (only for position strategy) */}
              {editStrategy === 'position' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Целевая позиция
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editTargetPosition}
                    onChange={(e) => setEditTargetPosition(parseInt(e.target.value) || 1)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Позиция в выдаче (1-10)</p>
                </div>
              )}

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Мин. цена (₸)
                  </label>
                  <input
                    type="number"
                    value={editMinPrice}
                    onChange={(e) => setEditMinPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Макс. цена (₸)
                  </label>
                  <input
                    type="number"
                    value={editMaxPrice}
                    onChange={(e) => setEditMaxPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Validation Error */}
              {editMinPrice >= editMaxPrice && (
                <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs sm:text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Мин. цена должна быть меньше макс.</span>
                </div>
              )}

              {/* Step */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Шаг изменения (₸)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={editStep}
                  onChange={(e) => setEditStep(parseInt(e.target.value) || 100)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">На сколько изменяется цена за раз</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky bottom-0">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-xs sm:text-sm cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={saveSettings}
                disabled={editMinPrice >= editMaxPrice}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-500 text-white rounded-lg sm:rounded-xl hover:bg-emerald-600 transition-colors font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
