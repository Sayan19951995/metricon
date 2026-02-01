'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Calendar,
  Users,
  BarChart3,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Package,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Типы периодов
type Period = '7d' | '30d' | '90d' | '365d' | 'custom';

// Моковые агрегированные данные (без персональных данных)
const generateAggregatedData = (startDate: Date, endDate: Date) => {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Генерация данных по дням
  const dailyData = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Случайные, но реалистичные данные
    const baseSales = 50 + Math.floor(Math.random() * 100);
    const weekday = date.getDay();
    const weekendMultiplier = (weekday === 0 || weekday === 6) ? 1.3 : 1;

    dailyData.push({
      date: date.toISOString().split('T')[0],
      salesCount: Math.floor(baseSales * weekendMultiplier),
      totalAmount: Math.floor((baseSales * weekendMultiplier) * (15000 + Math.random() * 25000)),
      avgOrderValue: Math.floor(15000 + Math.random() * 25000),
      uniqueMerchants: Math.floor(20 + Math.random() * 30),
    });
  }

  return dailyData;
};

// Категории товаров (анонимизированные)
const categoryStats = [
  { name: 'Электроника', salesCount: 4521, amount: 892000000, share: 35 },
  { name: 'Бытовая техника', salesCount: 2890, amount: 567000000, share: 22 },
  { name: 'Одежда и обувь', salesCount: 3456, amount: 234000000, share: 18 },
  { name: 'Дом и сад', salesCount: 1823, amount: 178000000, share: 14 },
  { name: 'Авто', salesCount: 987, amount: 145000000, share: 11 },
];

// Детальные данные по продуктам (анонимизированные - без привязки к мерчантам)
const productStats = [
  { id: 1, sku: 'SKU-001', name: 'iPhone 15 Pro Max 256GB', category: 'Электроника', salesCount: 847, totalAmount: 678500000, avgPrice: 801300 },
  { id: 2, sku: 'SKU-002', name: 'Samsung Galaxy S24 Ultra', category: 'Электроника', salesCount: 623, totalAmount: 436100000, avgPrice: 700000 },
  { id: 3, sku: 'SKU-003', name: 'MacBook Air M3 15"', category: 'Электроника', salesCount: 312, totalAmount: 281000000, avgPrice: 900600 },
  { id: 4, sku: 'SKU-004', name: 'AirPods Pro 2', category: 'Электроника', salesCount: 1456, totalAmount: 145600000, avgPrice: 100000 },
  { id: 5, sku: 'SKU-005', name: 'PlayStation 5', category: 'Электроника', salesCount: 534, totalAmount: 160200000, avgPrice: 300000 },
  { id: 6, sku: 'SKU-006', name: 'Dyson V15 Detect', category: 'Бытовая техника', salesCount: 289, totalAmount: 115600000, avgPrice: 400000 },
  { id: 7, sku: 'SKU-007', name: 'LG OLED 65" C3', category: 'Электроника', salesCount: 178, totalAmount: 178000000, avgPrice: 1000000 },
  { id: 8, sku: 'SKU-008', name: 'Робот-пылесос Roborock S8', category: 'Бытовая техника', salesCount: 445, totalAmount: 111250000, avgPrice: 250000 },
  { id: 9, sku: 'SKU-009', name: 'Nike Air Max 90', category: 'Одежда и обувь', salesCount: 892, totalAmount: 71360000, avgPrice: 80000 },
  { id: 10, sku: 'SKU-010', name: 'Adidas Ultraboost 23', category: 'Одежда и обувь', salesCount: 756, totalAmount: 60480000, avgPrice: 80000 },
  { id: 11, sku: 'SKU-011', name: 'Samsung холодильник RF65A', category: 'Бытовая техника', salesCount: 234, totalAmount: 140400000, avgPrice: 600000 },
  { id: 12, sku: 'SKU-012', name: 'Bosch стиральная машина', category: 'Бытовая техника', salesCount: 567, totalAmount: 141750000, avgPrice: 250000 },
  { id: 13, sku: 'SKU-013', name: 'iPad Pro 12.9" M2', category: 'Электроника', salesCount: 423, totalAmount: 338400000, avgPrice: 800000 },
  { id: 14, sku: 'SKU-014', name: 'Apple Watch Ultra 2', category: 'Электроника', salesCount: 634, totalAmount: 317000000, avgPrice: 500000 },
  { id: 15, sku: 'SKU-015', name: 'Кондиционер Mitsubishi', category: 'Бытовая техника', salesCount: 345, totalAmount: 138000000, avgPrice: 400000 },
  { id: 16, sku: 'SKU-016', name: 'Диван угловой IKEA', category: 'Дом и сад', salesCount: 289, totalAmount: 86700000, avgPrice: 300000 },
  { id: 17, sku: 'SKU-017', name: 'Матрас Askona 160x200', category: 'Дом и сад', salesCount: 456, totalAmount: 68400000, avgPrice: 150000 },
  { id: 18, sku: 'SKU-018', name: 'Шины Michelin 225/45 R17', category: 'Авто', salesCount: 1234, totalAmount: 74040000, avgPrice: 60000 },
  { id: 19, sku: 'SKU-019', name: 'Масло Mobil 1 5W-30 4L', category: 'Авто', salesCount: 2567, totalAmount: 38505000, avgPrice: 15000 },
  { id: 20, sku: 'SKU-020', name: 'Видеорегистратор Xiaomi', category: 'Авто', salesCount: 876, totalAmount: 35040000, avgPrice: 40000 },
  { id: 21, sku: 'SKU-021', name: 'Куртка зимняя Columbia', category: 'Одежда и обувь', salesCount: 678, totalAmount: 67800000, avgPrice: 100000 },
  { id: 22, sku: 'SKU-022', name: 'Джинсы Levi\'s 501', category: 'Одежда и обувь', salesCount: 1234, totalAmount: 49360000, avgPrice: 40000 },
  { id: 23, sku: 'SKU-023', name: 'Кресло офисное Herman Miller', category: 'Дом и сад', salesCount: 123, totalAmount: 61500000, avgPrice: 500000 },
  { id: 24, sku: 'SKU-024', name: 'Газонокосилка Husqvarna', category: 'Дом и сад', salesCount: 234, totalAmount: 46800000, avgPrice: 200000 },
  { id: 25, sku: 'SKU-025', name: 'Xiaomi Mi TV 55"', category: 'Электроника', salesCount: 567, totalAmount: 113400000, avgPrice: 200000 },
];

export default function SecretAnalyticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authAttempts, setAuthAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showAmounts, setShowAmounts] = useState(true);

  // Таблица товаров
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productSort, setProductSort] = useState<{ field: 'salesCount' | 'totalAmount' | 'avgPrice' | 'name'; dir: 'asc' | 'desc' }>({ field: 'totalAmount', dir: 'desc' });
  const [productPage, setProductPage] = useState(1);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const productsPerPage = 10;

  const categories = [
    { value: 'all', label: 'Все категории' },
    { value: 'Электроника', label: 'Электроника' },
    { value: 'Бытовая техника', label: 'Бытовая техника' },
    { value: 'Одежда и обувь', label: 'Одежда и обувь' },
    { value: 'Дом и сад', label: 'Дом и сад' },
    { value: 'Авто', label: 'Авто' },
  ];

  // Секретный код (в реальности хранить на сервере)
  const MASTER_CODE = 'METRICON2024';
  const MAX_ATTEMPTS = 3;

  const handleAuth = () => {
    if (isLocked) return;

    if (secretCode === MASTER_CODE) {
      setIsAuthenticated(true);
      setAuthError('');
      setAuthAttempts(0);
    } else {
      const newAttempts = authAttempts + 1;
      setAuthAttempts(newAttempts);
      setAuthError(`Неверный код. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`);
      setSecretCode('');

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setAuthError('Доступ заблокирован. Обратитесь к супер-администратору.');
      }
    }
  };

  // Расчёт дат периода
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '365d':
        start.setDate(end.getDate() - 365);
        break;
      case 'custom':
        if (customStart && customEnd) {
          start = new Date(customStart);
          return { startDate: start, endDate: new Date(customEnd) };
        }
        start.setDate(end.getDate() - 30);
        break;
    }

    return { startDate: start, endDate: end };
  }, [period, customStart, customEnd]);

  const aggregatedData = useMemo(() =>
    generateAggregatedData(startDate, endDate),
    [startDate, endDate]
  );

  // Расчёт итогов
  const totals = useMemo(() => {
    const totalSales = aggregatedData.reduce((sum, d) => sum + d.salesCount, 0);
    const totalAmount = aggregatedData.reduce((sum, d) => sum + d.totalAmount, 0);
    const avgOrder = totalAmount / totalSales;
    const uniqueMerchants = Math.max(...aggregatedData.map(d => d.uniqueMerchants));

    // Сравнение с предыдущим периодом (мок)
    const prevTotalSales = totalSales * (0.85 + Math.random() * 0.2);
    const prevTotalAmount = totalAmount * (0.85 + Math.random() * 0.2);

    return {
      totalSales,
      totalAmount,
      avgOrder,
      uniqueMerchants,
      salesGrowth: ((totalSales - prevTotalSales) / prevTotalSales) * 100,
      amountGrowth: ((totalAmount - prevTotalAmount) / prevTotalAmount) * 100,
    };
  }, [aggregatedData]);

  const formatAmount = (amount: number) => {
    if (!showAmounts) return '••••••••';
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B ₸`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₸`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K ₸`;
    return `${amount} ₸`;
  };

  // Фильтрация и сортировка товаров
  const filteredProducts = useMemo(() => {
    let result = [...productStats];

    // Поиск
    if (productSearch) {
      const search = productSearch.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search)
      );
    }

    // Фильтр по категории
    if (productCategory !== 'all') {
      result = result.filter(p => p.category === productCategory);
    }

    // Сортировка
    result.sort((a, b) => {
      const aVal = a[productSort.field];
      const bVal = b[productSort.field];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return productSort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return productSort.dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return result;
  }, [productSearch, productCategory, productSort]);

  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (productPage - 1) * productsPerPage,
    productPage * productsPerPage
  );

  const handleProductSort = (field: 'salesCount' | 'totalAmount' | 'avgPrice' | 'name') => {
    setProductSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (productSort.field !== field) return null;
    return productSort.dir === 'desc'
      ? <ChevronDown className="w-4 h-4" />
      : <ChevronUp className="w-4 h-4" />;
  };

  // Экран авторизации
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-xs">
          {isLocked ? (
            <div className="text-red-500 text-center text-sm">{authError}</div>
          ) : (
            <div className="space-y-3">
              <style>{`
                .secret-input {
                  -webkit-text-security: disc !important;
                  background-color: #1f2937 !important;
                  color: #ffffff !important;
                  caret-color: #ffffff !important;
                }
                .secret-input:-webkit-autofill,
                .secret-input:-webkit-autofill:hover,
                .secret-input:-webkit-autofill:focus,
                .secret-input:-webkit-autofill:active {
                  -webkit-box-shadow: 0 0 0 30px #1f2937 inset !important;
                  -webkit-text-fill-color: #ffffff !important;
                  background-color: #1f2937 !important;
                  transition: background-color 5000s ease-in-out 0s !important;
                }
              `}</style>
              <input
                type="text"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                placeholder=""
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                autoFocus
                className="secret-input w-full border border-gray-700 rounded-lg px-4 py-3 text-center focus:outline-none focus:border-gray-600 font-mono tracking-widest text-lg"
                maxLength={20}
              />
              {authError && (
                <p className="text-red-500 text-xs text-center">{authError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Основной контент
  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Секретный раздел</h1>
            <p className="text-gray-500 text-sm">Данные платформы</p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400 text-sm">Период:</span>

          {[
            { value: '7d', label: '7 дней' },
            { value: '30d', label: '30 дней' },
            { value: '90d', label: '90 дней' },
            { value: '365d', label: '1 год' },
            { value: 'custom', label: 'Свой' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as Period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <style>{`
                .dark-date-input::-webkit-calendar-picker-indicator {
                  filter: invert(1);
                  cursor: pointer;
                }
                .dark-date-input::-webkit-datetime-edit {
                  color: white;
                }
                .dark-date-input::-webkit-datetime-edit-fields-wrapper {
                  color: white;
                }
              `}</style>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="dark-date-input bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-gray-500">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="dark-date-input bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${
              totals.salesGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {totals.salesGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(totals.salesGrowth).toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totals.totalSales.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Всего продаж</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${
              totals.amountGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {totals.amountGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(totals.amountGrowth).toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{formatAmount(totals.totalAmount)}</div>
          <div className="text-sm text-gray-400">Общий оборот</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatAmount(totals.avgOrder)}</div>
          <div className="text-sm text-gray-400">Средний чек</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totals.uniqueMerchants}</div>
          <div className="text-sm text-gray-400">Активных мерчантов</div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Динамика продаж</h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-48 flex items-end gap-0.5">
            {aggregatedData.slice(-30).map((day, idx) => {
              const maxVal = Math.max(...aggregatedData.slice(-30).map(d => d.salesCount));
              const height = (day.salesCount / maxVal) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-blue-500 hover:bg-blue-400 rounded-t transition-colors cursor-pointer"
                  style={{ height: `${height}%` }}
                  title={`${day.date}: ${day.salesCount} продаж`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{aggregatedData[Math.max(0, aggregatedData.length - 30)]?.date}</span>
            <span>{aggregatedData[aggregatedData.length - 1]?.date}</span>
          </div>
        </motion.div>

        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Динамика оборота</h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-48 flex items-end gap-0.5">
            {aggregatedData.slice(-30).map((day, idx) => {
              const maxVal = Math.max(...aggregatedData.slice(-30).map(d => d.totalAmount));
              const height = (day.totalAmount / maxVal) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 rounded-t transition-colors cursor-pointer"
                  style={{ height: `${height}%` }}
                  title={`${day.date}: ${formatAmount(day.totalAmount)}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{aggregatedData[Math.max(0, aggregatedData.length - 30)]?.date}</span>
            <span>{aggregatedData[aggregatedData.length - 1]?.date}</span>
          </div>
        </motion.div>
      </div>

      {/* Category Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-800 rounded-xl p-5 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Статистика по категориям</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Категория</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Кол-во продаж</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Оборот</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Доля</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((cat, idx) => (
                <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3 px-4 text-sm text-white">{cat.name}</td>
                  <td className="py-3 px-4 text-sm text-white text-right">{cat.salesCount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-white text-right">{formatAmount(cat.amount)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${cat.share}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-10">{cat.share}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Product Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-gray-800 rounded-xl p-5 border border-gray-700 mt-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Детализация по товарам</h3>
            <span className="text-gray-500 text-sm">({filteredProducts.length})</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Поиск по названию или SKU..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
                style={{ paddingLeft: '44px' }}
                className="bg-gray-700 border border-gray-600 rounded-lg pr-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-72"
              />
            </div>

            {/* Фильтр по категории */}
            <div className="relative">
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2 min-w-[160px] justify-between"
              >
                <span>{categories.find(c => c.value === productCategory)?.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {categoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCategoryDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 min-w-[160px] py-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => {
                          setProductCategory(cat.value);
                          setProductPage(1);
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          productCategory === cat.value
                            ? 'bg-red-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">SKU</th>
                <th
                  className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleProductSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Товар
                    <SortIcon field="name" />
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 hidden md:table-cell">Категория</th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleProductSort('salesCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Продаж
                    <SortIcon field="salesCount" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleProductSort('totalAmount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Сумма
                    <SortIcon field="totalAmount" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors hidden sm:table-cell"
                  onClick={() => handleProductSort('avgPrice')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Ср. цена
                    <SortIcon field="avgPrice" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3 px-4 text-sm text-gray-400 font-mono">{product.sku}</td>
                  <td className="py-3 px-4 text-sm text-white">{product.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-400 hidden md:table-cell">{product.category}</td>
                  <td className="py-3 px-4 text-sm text-white text-right font-medium">{product.salesCount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-emerald-400 text-right font-medium">{formatAmount(product.totalAmount)}</td>
                  <td className="py-3 px-4 text-sm text-gray-300 text-right hidden sm:table-cell">{formatAmount(product.avgPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Пагинация */}
        {totalProductPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-500">
              {((productPage - 1) * productsPerPage) + 1}-{Math.min(productPage * productsPerPage, filteredProducts.length)} из {filteredProducts.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProductPage(p => Math.max(1, p - 1))}
                disabled={productPage === 1}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <span className="text-sm text-gray-400 px-2">
                {productPage} / {totalProductPages}
              </span>
              <button
                onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))}
                disabled={productPage === totalProductPages}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Footer Warning */}
      <div className="mt-6 flex items-center justify-center gap-2 text-gray-600 text-xs">
        <Lock className="w-3 h-3" />
        <span>Данные защищены • Доступ ограничен</span>
      </div>
    </div>
  );
}
