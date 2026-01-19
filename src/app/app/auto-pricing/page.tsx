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
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Автоцена</h1>
          <p className="text-gray-500 mt-1">Автоматическое управление ценами для конкуренции на Kaspi</p>
        </div>
        <a
          href="/app/auto-pricing/history"
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          История изменений
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-gray-500 text-sm">Всего товаров</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-gray-500 text-sm">Автоцена вкл.</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {stats.enabled} <span className="text-base font-normal text-gray-400">из {stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-gray-500 text-sm">Изменений за 24ч</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.changesTotal}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-500 text-sm">Ошибки</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-500 text-sm">На 1 месте</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.firstPlace} <span className="text-base font-normal text-gray-400">из {stats.total}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm mb-6">
        <div className="p-4 flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или SKU..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Все ({stats.total})
            </button>
            <button
              onClick={() => handleFilterChange('enabled')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === 'enabled' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              Включено ({stats.enabled})
            </button>
            <button
              onClick={() => handleFilterChange('disabled')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                statusFilter === 'disabled' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Выключено ({stats.total - stats.enabled})
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {paginatedProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Товаров не найдено</h3>
            <p className="text-gray-500">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedProducts.map(product => (
              <div
                key={product.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${product.autoPricing?.status === 'error' ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleAutoPricing(product.id)}
                    className="flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
                    title={product.autoPricing ? 'Выключить автоцену' : 'Включить автоцену'}
                  >
                    {product.autoPricing ? (
                      <ToggleRight className="w-10 h-10 text-emerald-500 transition-colors duration-300" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-300 hover:text-gray-400 transition-colors duration-300" />
                    )}
                  </button>

                  {/* Product Info */}
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {product.image}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{product.name}</span>
                      {product.autoPricing && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          product.autoPricing.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          product.autoPricing.status === 'paused' ? 'bg-gray-100 text-gray-600' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {product.autoPricing.status === 'active' ? <Play className="w-3 h-3" /> :
                           product.autoPricing.status === 'paused' ? <Pause className="w-3 h-3" /> :
                           <AlertTriangle className="w-3 h-3" />}
                          {product.autoPricing.status === 'active' ? 'Активно' :
                           product.autoPricing.status === 'paused' ? 'На паузе' : 'Ошибка'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="font-mono">{product.sku}</span>
                      {product.autoPricing && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {getStrategyIcon(product.autoPricing.strategy)}
                            {getStrategyLabel(product.autoPricing.strategy)}
                          </span>
                          <span>•</span>
                          <span>Обновлено {formatDate(product.autoPricing.lastUpdate)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price Info */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {product.currentPrice.toLocaleString('ru-RU')} ₸
                    </div>
                    <div className="text-sm text-gray-500">
                      Конкурент: {product.competitorPrice.toLocaleString('ru-RU')} ₸
                    </div>
                  </div>

                  {/* Position */}
                  <div className="w-16 text-center">
                    <div className={`text-lg font-bold ${product.position === 1 ? 'text-emerald-600' : product.position <= 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                      #{product.position}
                    </div>
                    <div className="text-xs text-gray-500">позиция</div>
                  </div>

                  {/* Price Range (only if enabled) */}
                  {product.autoPricing ? (
                    <div className="w-28">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{(product.autoPricing.minPrice / 1000).toFixed(0)}к</span>
                        <span>{(product.autoPricing.maxPrice / 1000).toFixed(0)}к</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${((product.currentPrice - product.autoPricing.minPrice) / (product.autoPricing.maxPrice - product.autoPricing.minPrice)) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 text-center mt-1">диапазон</div>
                    </div>
                  ) : (
                    <div className="w-28 text-center text-xs text-gray-400">
                      —
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {product.autoPricing && (
                      <button
                        onClick={() => togglePause(product.id)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          product.autoPricing.status === 'active'
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-600'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'
                        }`}
                        title={product.autoPricing.status === 'active' ? 'Приостановить' : 'Запустить'}
                      >
                        {product.autoPricing.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors cursor-pointer"
                      title="Настройки"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {product.autoPricing?.status === 'error' && (
                  <div className="mt-3 p-3 bg-red-100 rounded-lg flex items-center gap-2 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Не удалось обновить цену: достигнут минимальный порог. Конкурент: {product.competitorName} ({product.competitorPrice.toLocaleString('ru-RU')} ₸)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Показано {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} из {filteredProducts.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    page === currentPage
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Block */}
      <div className="mt-6 bg-blue-50 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Как работает автоцена?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Включите автоцену для товара, и система будет автоматически корректировать цены в пределах заданного диапазона.
            </p>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <span><strong>Демпинг</strong> — всегда дешевле конкурента</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                <span><strong>Паритет</strong> — равная цена</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-purple-600" />
                <span><strong>Позиция</strong> — удержание места в выдаче</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Настройки автоцены</h2>
                <p className="text-sm text-gray-500">{editingProduct.name}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Strategy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Стратегия
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {strategies.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setEditStrategy(s.value)}
                      className={`p-3 rounded-xl border-2 transition-colors text-left cursor-pointer ${
                        editStrategy === s.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {s.icon}
                        <span className="font-medium text-sm">{s.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{s.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Position (only for position strategy) */}
              {editStrategy === 'position' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Целевая позиция
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editTargetPosition}
                    onChange={(e) => setEditTargetPosition(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Позиция в выдаче, которую нужно удерживать (1-10)</p>
                </div>
              )}

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Минимальная цена (₸)
                  </label>
                  <input
                    type="number"
                    value={editMinPrice}
                    onChange={(e) => setEditMinPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Максимальная цена (₸)
                  </label>
                  <input
                    type="number"
                    value={editMaxPrice}
                    onChange={(e) => setEditMaxPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Validation Error */}
              {editMinPrice >= editMaxPrice && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Минимальная цена должна быть меньше максимальной
                </div>
              )}

              {/* Step */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Шаг изменения цены (₸)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={editStep}
                  onChange={(e) => setEditStep(parseInt(e.target.value) || 100)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">На сколько будет изменяться цена за одно обновление</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={saveSettings}
                disabled={editMinPrice >= editMaxPrice}
                className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
