'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Search,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Clock
} from 'lucide-react';

// Типы
type ChangeType = 'decrease' | 'increase' | 'match';

interface PriceChange {
  id: string;
  productId: number;
  productName: string;
  productSku: string;
  productImage: string;
  changeType: ChangeType;
  oldPrice: number;
  newPrice: number;
  competitorPrice: number;
  competitorName: string;
  reason: string;
  timestamp: string;
  position: number;
}

// Mock данные истории
const mockHistory: PriceChange[] = [
  {
    id: 'ch-1',
    productId: 1,
    productName: 'iPhone 14 Pro 256GB',
    productSku: 'APL-IP14P-256',
    productImage: '📱',
    changeType: 'decrease',
    oldPrice: 451900,
    newPrice: 449900,
    competitorPrice: 451900,
    competitorName: 'TechStore KZ',
    reason: 'Демпинг: цена снижена на 2000 ₸ ниже конкурента',
    timestamp: '2025-01-16T10:30:00',
    position: 2,
  },
  {
    id: 'ch-2',
    productId: 4,
    productName: 'MacBook Pro 14" M3',
    productSku: 'APL-MBP14-M3',
    productImage: '💻',
    changeType: 'decrease',
    oldPrice: 1155000,
    newPrice: 1149900,
    competitorPrice: 1155000,
    competitorName: 'Digital Store',
    reason: 'Демпинг: цена снижена на 5100 ₸ ниже конкурента',
    timestamp: '2025-01-16T11:00:00',
    position: 1,
  },
  {
    id: 'ch-3',
    productId: 2,
    productName: 'Samsung Galaxy S24 Ultra',
    productSku: 'SAM-S24U-256',
    productImage: '📱',
    changeType: 'increase',
    oldPrice: 545900,
    newPrice: 549900,
    competitorPrice: 555000,
    competitorName: 'Mobile World',
    reason: 'Позиция: цена повышена для оптимизации маржи',
    timestamp: '2025-01-16T09:15:00',
    position: 3,
  },
  {
    id: 'ch-4',
    productId: 1,
    productName: 'iPhone 14 Pro 256GB',
    productSku: 'APL-IP14P-256',
    productImage: '📱',
    changeType: 'decrease',
    oldPrice: 455000,
    newPrice: 451900,
    competitorPrice: 453000,
    competitorName: 'Gadget KZ',
    reason: 'Демпинг: цена снижена на 1100 ₸ ниже конкурента',
    timestamp: '2025-01-16T08:45:00',
    position: 3,
  },
  {
    id: 'ch-5',
    productId: 3,
    productName: 'AirPods Pro 2',
    productSku: 'APL-APP2',
    productImage: '🎧',
    changeType: 'match',
    oldPrice: 91900,
    newPrice: 89900,
    competitorPrice: 89900,
    competitorName: 'Apple Store KZ',
    reason: 'Паритет: цена установлена равной конкуренту',
    timestamp: '2025-01-15T18:45:00',
    position: 1,
  },
  {
    id: 'ch-6',
    productId: 4,
    productName: 'MacBook Pro 14" M3',
    productSku: 'APL-MBP14-M3',
    productImage: '💻',
    changeType: 'decrease',
    oldPrice: 1165000,
    newPrice: 1155000,
    competitorPrice: 1160000,
    competitorName: 'iStore KZ',
    reason: 'Демпинг: цена снижена на 5000 ₸ ниже конкурента',
    timestamp: '2025-01-15T16:30:00',
    position: 2,
  },
  {
    id: 'ch-7',
    productId: 1,
    productName: 'iPhone 14 Pro 256GB',
    productSku: 'APL-IP14P-256',
    productImage: '📱',
    changeType: 'increase',
    oldPrice: 448000,
    newPrice: 455000,
    competitorPrice: 460000,
    competitorName: 'MegaStore',
    reason: 'Позиция: конкурент поднял цену, оптимизация маржи',
    timestamp: '2025-01-15T14:20:00',
    position: 1,
  },
  {
    id: 'ch-8',
    productId: 2,
    productName: 'Samsung Galaxy S24 Ultra',
    productSku: 'SAM-S24U-256',
    productImage: '📱',
    changeType: 'decrease',
    oldPrice: 555000,
    newPrice: 545900,
    competitorPrice: 549000,
    competitorName: 'Galaxy Store',
    reason: 'Демпинг: цена снижена на 3100 ₸ ниже конкурента',
    timestamp: '2025-01-15T12:00:00',
    position: 2,
  },
];

export default function AutoPricingHistoryPage() {
  const [history] = useState<PriceChange[]>(mockHistory);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ChangeType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Фильтрация истории
  const filteredHistory = history.filter(change => {
    const matchesSearch = change.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          change.productSku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || change.changeType === typeFilter;

    // Фильтр по дате
    const changeDate = new Date(change.timestamp);
    const now = new Date();
    let matchesDate = true;

    if (dateFilter === 'today') {
      matchesDate = changeDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = changeDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = changeDate >= monthAgo;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Группировка по дням
  const groupedHistory = filteredHistory.reduce((groups, change) => {
    const date = formatDate(change.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(change);
    return groups;
  }, {} as Record<string, PriceChange[]>);

  // Получить иконку типа изменения
  const getChangeIcon = (type: ChangeType) => {
    switch (type) {
      case 'decrease': return <TrendingDown className="w-4 h-4" />;
      case 'increase': return <TrendingUp className="w-4 h-4" />;
      case 'match': return <Minus className="w-4 h-4" />;
    }
  };

  // Получить цвет типа изменения
  const getChangeColor = (type: ChangeType) => {
    switch (type) {
      case 'decrease': return 'text-red-600 bg-red-100';
      case 'increase': return 'text-emerald-600 bg-emerald-100';
      case 'match': return 'text-blue-600 bg-blue-100';
    }
  };

  // Статистика
  const stats = {
    total: filteredHistory.length,
    decreases: filteredHistory.filter(c => c.changeType === 'decrease').length,
    increases: filteredHistory.filter(c => c.changeType === 'increase').length,
    matches: filteredHistory.filter(c => c.changeType === 'match').length,
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <a
          href="/app/auto-pricing"
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </a>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">История изменений</h1>
          <p className="text-gray-500 text-xs sm:text-base mt-0.5 sm:mt-1 hidden sm:block">Все автоматические корректировки цен</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Всего</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-red-600 mb-0.5 sm:mb-1">
            <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Снижения</span>
            <span className="sm:hidden">Сниж.</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.decreases}</div>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-emerald-600 mb-0.5 sm:mb-1">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Повышения</span>
            <span className="sm:hidden">Повыш.</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.increases}</div>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-blue-600 mb-0.5 sm:mb-1">
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Паритет
          </div>
          <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.matches}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm mb-4 sm:mb-6">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-11 pr-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setTypeFilter('decrease')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                typeFilter === 'decrease' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <TrendingDown className="w-3 h-3" />
              <span className="hidden sm:inline">Снижения</span>
            </button>
            <button
              onClick={() => setTypeFilter('increase')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                typeFilter === 'increase' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span className="hidden sm:inline">Повышения</span>
            </button>
            <button
              onClick={() => setTypeFilter('match')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                typeFilter === 'match' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Minus className="w-3 h-3" />
              <span className="hidden sm:inline">Паритет</span>
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Всё время</option>
              <option value="today">Сегодня</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
            </select>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4 sm:space-y-6">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-8 sm:p-12 text-center">
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">История пуста</h3>
            <p className="text-gray-500 text-sm">
              {searchQuery || typeFilter !== 'all' || dateFilter !== 'all'
                ? 'Попробуйте изменить параметры поиска'
                : 'Изменения цен будут отображаться здесь'}
            </p>
          </div>
        ) : (
          Object.entries(groupedHistory).map(([date, changes]) => (
            <div key={date}>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="text-xs sm:text-sm font-semibold text-gray-900">{date}</div>
                <div className="flex-1 h-px bg-gray-200" />
                <div className="text-[10px] sm:text-xs text-gray-500">{changes.length} изм.</div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {changes.map(change => (
                    <div key={change.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                      {/* Mobile Layout */}
                      <div className="sm:hidden">
                        <div className="flex items-start gap-2">
                          {/* Change Type Icon */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${getChangeColor(change.changeType)}`}>
                            {getChangeIcon(change.changeType)}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Product name and time */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm truncate">{change.productName}</span>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(change.timestamp)}</span>
                            </div>

                            {/* Prices */}
                            <div className="flex items-center gap-1.5 text-xs mb-1">
                              <span className="text-gray-400 line-through">
                                {(change.oldPrice / 1000).toFixed(0)}к
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-bold text-gray-900">
                                {(change.newPrice / 1000).toFixed(0)}к ₸
                              </span>
                              <span className={`font-medium ${
                                change.changeType === 'decrease' ? 'text-red-600' :
                                change.changeType === 'increase' ? 'text-emerald-600' : 'text-blue-600'
                              }`}>
                                ({change.changeType === 'decrease' ? '-' : change.changeType === 'increase' ? '+' : ''}
                                {(Math.abs(change.newPrice - change.oldPrice) / 1000).toFixed(0)}к)
                              </span>
                            </div>

                            {/* Position */}
                            <div className="text-[10px] text-gray-500">
                              Позиция: <span className={`font-bold ${
                                change.position === 1 ? 'text-emerald-600' :
                                change.position <= 3 ? 'text-amber-600' : 'text-gray-600'
                              }`}>#{change.position}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:block">
                        <div className="flex items-center gap-3 lg:gap-4">
                          {/* Time */}
                          <div className="w-12 lg:w-16 text-center">
                            <div className="text-xs lg:text-sm font-medium text-gray-900">
                              {formatTime(change.timestamp)}
                            </div>
                          </div>

                          {/* Change Type Icon */}
                          <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center ${getChangeColor(change.changeType)}`}>
                            {getChangeIcon(change.changeType)}
                          </div>

                          {/* Product */}
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg lg:text-xl">
                            {change.productImage}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-xs lg:text-sm truncate">{change.productName}</div>
                            <div className="text-[10px] lg:text-xs text-gray-500 font-mono">{change.productSku}</div>
                          </div>

                          {/* Price Change */}
                          <div className="text-right">
                            <div className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
                              <span className="text-gray-400 line-through hidden lg:inline">
                                {change.oldPrice.toLocaleString('ru-RU')} ₸
                              </span>
                              <span className="text-gray-400 line-through lg:hidden">
                                {(change.oldPrice / 1000).toFixed(0)}к
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-bold text-gray-900 hidden lg:inline">
                                {change.newPrice.toLocaleString('ru-RU')} ₸
                              </span>
                              <span className="font-bold text-gray-900 lg:hidden">
                                {(change.newPrice / 1000).toFixed(0)}к
                              </span>
                            </div>
                            <div className={`text-[10px] lg:text-xs font-medium ${
                              change.changeType === 'decrease' ? 'text-red-600' :
                              change.changeType === 'increase' ? 'text-emerald-600' : 'text-blue-600'
                            }`}>
                              {change.changeType === 'decrease' ? '-' : change.changeType === 'increase' ? '+' : ''}
                              {Math.abs(change.newPrice - change.oldPrice).toLocaleString('ru-RU')} ₸
                            </div>
                          </div>

                          {/* Competitor - hidden on smaller screens */}
                          <div className="w-28 lg:w-32 text-right hidden lg:block">
                            <div className="text-[10px] lg:text-xs text-gray-500">Конкурент</div>
                            <div className="text-xs lg:text-sm font-medium text-gray-700">
                              {change.competitorPrice.toLocaleString('ru-RU')} ₸
                            </div>
                            <div className="text-[10px] lg:text-xs text-gray-400 truncate" title={change.competitorName}>
                              {change.competitorName}
                            </div>
                          </div>

                          {/* Position */}
                          <div className="w-12 lg:w-16 text-center">
                            <div className={`text-base lg:text-lg font-bold ${
                              change.position === 1 ? 'text-emerald-600' :
                              change.position <= 3 ? 'text-amber-600' : 'text-gray-600'
                            }`}>
                              #{change.position}
                            </div>
                            <div className="text-[10px] lg:text-xs text-gray-500">позиция</div>
                          </div>
                        </div>

                        {/* Reason - hidden on mobile */}
                        <div className="mt-2 ml-20 lg:ml-24 text-[10px] lg:text-xs text-gray-500 hidden lg:block">
                          {change.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
