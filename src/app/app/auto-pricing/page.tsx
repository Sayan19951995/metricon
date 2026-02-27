'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingDown,
  Play,
  Pause,
  Settings,
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
  ToggleRight,
  Loader2,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

// Типы
type Strategy = 'undercut' | 'match' | 'position';

interface AutoPricingRule {
  id: string;
  sku: string;
  product_name: string | null;
  strategy: Strategy;
  min_price: number;
  max_price: number;
  step: number;
  target_position: number | null;
  status: 'active' | 'paused' | 'error';
  last_competitor_price: number | null;
  last_competitor_name: string | null;
  last_check_at: string | null;
  last_price_change_at: string | null;
  error_message: string | null;
  price_changes_24h: number;
  created_at: string | null;
}

interface BFFProduct {
  sku: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  shopLink?: string;
  masterSku?: string;
}

interface Product {
  sku: string;
  name: string;
  image: string;
  currentPrice: number;
  competitorPrice: number | null;
  competitorName: string | null;
  autoPricing: {
    id: string;
    enabled: boolean;
    strategy: Strategy;
    minPrice: number;
    maxPrice: number;
    step: number;
    targetPosition?: number;
    status: 'active' | 'paused' | 'error';
    lastUpdate: string;
    priceChanges24h: number;
    errorMessage: string | null;
  } | null;
}

// Стратегии
const strategies: { value: Strategy; label: string; shortDesc: string; fullDesc: string; icon: React.ReactNode }[] = [
  {
    value: 'undercut',
    label: 'Демпинг',
    shortDesc: 'Всегда дешевле конкурента',
    fullDesc: 'Автоматически устанавливает цену ниже самого дешёвого конкурента на указанный шаг. Если конкурент снижает цену — вы тоже снижаете. Цена не опустится ниже минимальной границы.',
    icon: <TrendingDown className="w-4 h-4" />
  },
  {
    value: 'match',
    label: 'Паритет',
    shortDesc: 'Равная цена с конкурентом',
    fullDesc: 'Поддерживает вашу цену на уровне самого дешёвого конкурента. Вы не демпингуете, но и не теряете позиции. Хороший баланс между маржой и конкурентоспособностью.',
    icon: <Target className="w-4 h-4" />
  },
  {
    value: 'position',
    label: 'Позиция',
    shortDesc: 'Удержание позиции в выдаче',
    fullDesc: 'Подбирает цену так, чтобы удерживать заданную позицию в выдаче Kaspi (1–10). Если позиция теряется — цена снижается; если позиция лучше целевой — цена повышается для максимизации прибыли.',
    icon: <Zap className="w-4 h-4" />
  },
];

const ITEMS_PER_PAGE = 10;

export default function AutoPricingPage() {
  const { user, loading: userLoading } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  // Состояние модалки редактирования
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editStrategy, setEditStrategy] = useState<Strategy>('undercut');
  const [editMinPrice, setEditMinPrice] = useState<number>(0);
  const [editMaxPrice, setEditMaxPrice] = useState<number>(0);
  const [editStep, setEditStep] = useState<number>(1000);
  const [editTargetPosition, setEditTargetPosition] = useState<number>(1);
  const [showStrategyHint, setShowStrategyHint] = useState(false);

  // Загрузка данных
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Загрузка товаров из BFF и правил из БД параллельно
      const [productsRes, rulesRes] = await Promise.all([
        fetch(`/api/kaspi/cabinet/products?userId=${user.id}`),
        fetch(`/api/auto-pricing?userId=${user.id}`),
      ]);

      const productsData = await productsRes.json();
      const rulesData = await rulesRes.json();

      if (!productsData.success) {
        console.error('Failed to load products:', productsData.error);
        setLoading(false);
        return;
      }

      const bffProducts: BFFProduct[] = productsData.products || [];
      const rules: AutoPricingRule[] = rulesData.success ? (rulesData.rules || []) : [];

      // Build rule map by SKU
      const ruleMap = new Map<string, AutoPricingRule>();
      for (const rule of rules) {
        ruleMap.set(rule.sku, rule);
      }

      // Merge BFF products + rules
      const merged: Product[] = bffProducts.map(p => {
        const rule = ruleMap.get(p.sku);
        return {
          sku: p.sku,
          name: p.name,
          image: p.images?.[0] || '',
          currentPrice: p.price,
          competitorPrice: rule?.last_competitor_price ?? null,
          competitorName: rule?.last_competitor_name ?? null,
          autoPricing: rule ? {
            id: rule.id,
            enabled: true,
            strategy: rule.strategy,
            minPrice: rule.min_price,
            maxPrice: rule.max_price,
            step: rule.step,
            targetPosition: rule.target_position ?? undefined,
            status: rule.status,
            lastUpdate: rule.last_price_change_at || rule.last_check_at || rule.created_at || '',
            priceChanges24h: rule.price_changes_24h || 0,
            errorMessage: rule.error_message,
          } : null,
        };
      });

      setProducts(merged);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, loadData]);

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
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
  const toggleAutoPricing = async (sku: string) => {
    if (!user?.id) return;
    const product = products.find(p => p.sku === sku);
    if (!product) return;

    setSaving(true);
    try {
      if (product.autoPricing) {
        // Удалить правило
        await fetch(`/api/auto-pricing?userId=${user.id}&id=${product.autoPricing.id}`, {
          method: 'DELETE',
        });
        setProducts(prev => prev.map(p =>
          p.sku === sku ? { ...p, autoPricing: null } : p
        ));
      } else {
        // Создать правило с дефолтными настройками
        const res = await fetch('/api/auto-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            sku,
            productName: product.name,
            strategy: 'undercut',
            minPrice: Math.round(product.currentPrice * 0.9),
            maxPrice: Math.round(product.currentPrice * 1.1),
            step: 1000,
          }),
        });
        const data = await res.json();
        if (data.success && data.rule) {
          setProducts(prev => prev.map(p =>
            p.sku === sku ? {
              ...p,
              autoPricing: {
                id: data.rule.id,
                enabled: true,
                strategy: 'undercut',
                minPrice: data.rule.min_price,
                maxPrice: data.rule.max_price,
                step: data.rule.step,
                status: 'active',
                lastUpdate: data.rule.created_at || new Date().toISOString(),
                priceChanges24h: 0,
                errorMessage: null,
              },
            } : p
          ));
        }
      }
    } catch (err) {
      console.error('Toggle auto-pricing error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Поставить на паузу / возобновить
  const togglePause = async (sku: string) => {
    if (!user?.id) return;
    const product = products.find(p => p.sku === sku);
    if (!product?.autoPricing) return;

    const newStatus = product.autoPricing.status === 'active' ? 'paused' : 'active';
    setSaving(true);
    try {
      const res = await fetch('/api/auto-pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          id: product.autoPricing.id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.map(p =>
          p.sku === sku && p.autoPricing ? {
            ...p,
            autoPricing: { ...p.autoPricing, status: newStatus, errorMessage: null },
          } : p
        ));
      }
    } catch (err) {
      console.error('Toggle pause error:', err);
    } finally {
      setSaving(false);
    }
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
  const saveSettings = async () => {
    if (!editingProduct || !user?.id) return;
    if (editMinPrice >= editMaxPrice) return;

    setSaving(true);
    try {
      const res = await fetch('/api/auto-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sku: editingProduct.sku,
          productName: editingProduct.name,
          strategy: editStrategy,
          minPrice: editMinPrice,
          maxPrice: editMaxPrice,
          step: editStep,
          targetPosition: editStrategy === 'position' ? editTargetPosition : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.rule) {
        setProducts(prev => prev.map(p =>
          p.sku === editingProduct.sku ? {
            ...p,
            autoPricing: {
              id: data.rule.id,
              enabled: true,
              strategy: editStrategy,
              minPrice: editMinPrice,
              maxPrice: editMaxPrice,
              step: editStep,
              targetPosition: editStrategy === 'position' ? editTargetPosition : undefined,
              status: data.rule.status || p.autoPricing?.status || 'active',
              lastUpdate: p.autoPricing?.lastUpdate || new Date().toISOString(),
              priceChanges24h: p.autoPricing?.priceChanges24h || 0,
              errorMessage: null,
            },
          } : p
        ));
        setEditingProduct(null);
      }
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
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

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Загрузка товаров...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Автоцена</h1>
            <button onClick={() => setShowHelp(!showHelp)} className="focus:outline-none cursor-pointer">
              <HelpCircle className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mt-1 hidden sm:block">Автоматическое управление ценами для конкуренции на Kaspi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 sm:p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href="/app/auto-pricing/history"
            className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-xs sm:text-sm flex items-center gap-2 w-fit"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">История изменений</span>
            <span className="sm:hidden">История</span>
          </a>
        </div>
      </div>

      {/* Help Block */}
      {showHelp && (
        <div className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Как работает автоцена?</h3>
            <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
            Система каждые 15 минут проверяет цены конкурентов на Kaspi и автоматически корректирует вашу цену в заданных границах.
          </p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Демпинг</span>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Ставит цену ниже самого дешёвого конкурента на указанный шаг. Если конкурент 220 000 ₸ и шаг 1 000 ₸ — ваша цена станет 219 000 ₸.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Паритет</span>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Ставит точно такую же цену как у самого дешёвого конкурента. Не дешевле, не дороже.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Позиция</span>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Корректирует цену для удержания позиции в выдаче Kaspi.</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400"><strong className="text-gray-700 dark:text-gray-300">Мин. цена</strong> — ниже этой суммы система не опустит цену, даже если конкурент дешевле.</p>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400"><strong className="text-gray-700 dark:text-gray-300">Макс. цена</strong> — выше этой суммы цена не поднимется.</p>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400"><strong className="text-gray-700 dark:text-gray-300">Шаг</strong> — на сколько тенге менять цену за раз.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
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
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {products.length === 0 ? 'Нет товаров' : 'Товаров не найдено'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {products.length === 0
                ? 'Подключите Kaspi кабинет для загрузки товаров'
                : 'Попробуйте изменить параметры поиска'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {paginatedProducts.map(product => (
              <div
                key={product.sku}
                className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${product.autoPricing?.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
              >
                {/* Mobile Layout */}
                <div className="sm:hidden">
                  <div className="flex items-start gap-3">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleAutoPricing(product.sku)}
                      disabled={saving}
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

                      {/* Price row */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {product.currentPrice.toLocaleString('ru-RU')} ₸
                        </span>
                        {product.competitorPrice && (
                          <span className="text-xs text-gray-400">
                            / {product.competitorPrice.toLocaleString('ru-RU')} ₸
                          </span>
                        )}
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
                          onClick={() => togglePause(product.sku)}
                          disabled={saving}
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
                      <span>{product.autoPricing.errorMessage || 'Достигнут минимальный порог'}</span>
                    </div>
                  )}
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:block">
                  <div className="flex items-center gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleAutoPricing(product.sku)}
                      disabled={saving}
                      className="flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
                      title={product.autoPricing ? 'Выключить автоцену' : 'Включить автоцену'}
                    >
                      {product.autoPricing ? (
                        <ToggleRight className="w-8 h-8 text-emerald-500 transition-colors duration-300" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-300 hover:text-gray-400 transition-colors duration-300" />
                      )}
                    </button>

                    {/* Product Image */}
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span className="text-gray-400 text-sm">?</span>
                      )}
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
                            {product.autoPricing.lastUpdate && (
                              <>
                                <span className="hidden lg:inline">•</span>
                                <span className="hidden lg:inline">Обновлено {formatDate(product.autoPricing.lastUpdate)}</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="text-right">
                      <div className="text-base font-bold text-gray-900 dark:text-white">
                        {product.currentPrice.toLocaleString('ru-RU')} ₸
                      </div>
                      {product.competitorPrice && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">
                          Конкурент: {product.competitorPrice.toLocaleString('ru-RU')} ₸
                        </div>
                      )}
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
                                width: `${Math.max(0, Math.min(100, ((product.currentPrice - product.autoPricing.minPrice) / (product.autoPricing.maxPrice - product.autoPricing.minPrice)) * 100))}%`,
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
                          onClick={() => togglePause(product.sku)}
                          disabled={saving}
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
                      <span>{product.autoPricing.errorMessage || 'Не удалось обновить цену: достигнут минимальный порог'}{product.competitorName ? `. Конкурент: ${product.competitorName}` : ''}{product.competitorPrice ? ` (${product.competitorPrice.toLocaleString('ru-RU')} ₸)` : ''}</span>
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
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(page => (
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
                      className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-colors text-center cursor-pointer ${
                        editStrategy === s.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        {s.icon}
                        <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{s.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Collapsible strategy hint */}
                <button
                  onClick={() => setShowStrategyHint(prev => !prev)}
                  className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Как это работает?</span>
                  {showStrategyHint
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  }
                </button>
                {showStrategyHint && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                      {strategies.find(s => s.value === editStrategy)?.label}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {strategies.find(s => s.value === editStrategy)?.fullDesc}
                    </p>
                  </div>
                )}
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

              {/* Current competitor info */}
              {editingProduct.competitorPrice && (
                <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Последний конкурент: <strong>{editingProduct.competitorName || 'Неизвестный'}</strong> — {editingProduct.competitorPrice.toLocaleString('ru-RU')} ₸
                </div>
              )}
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
                disabled={editMinPrice >= editMaxPrice || saving}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-500 text-white rounded-lg sm:rounded-xl hover:bg-emerald-600 transition-colors font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
