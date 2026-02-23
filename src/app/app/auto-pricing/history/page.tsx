'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Clock,
  Loader2
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

// Типы
type ChangeType = 'decrease' | 'increase' | 'match';

interface PriceChange {
  id: string;
  sku: string;
  product_name: string;
  change_type: ChangeType;
  old_price: number;
  new_price: number;
  competitor_price: number | null;
  competitor_name: string | null;
  reason: string | null;
  created_at: string;
}

export default function AutoPricingHistoryPage() {
  const { user, loading: userLoading } = useUser();
  const [history, setHistory] = useState<PriceChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ChangeType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    if (!user?.id) return;

    async function loadHistory() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ userId: user!.id });
        if (typeFilter !== 'all') params.set('type', typeFilter);
        if (dateFilter !== 'all') params.set('period', dateFilter);

        const res = await fetch(`/api/auto-pricing/history?${params}`);
        const data = await res.json();
        if (data.success) {
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [user?.id, typeFilter, dateFilter]);

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

  // Фильтрация по поиску (клиентская)
  const filteredHistory = history.filter(change => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (change.product_name || '').toLowerCase().includes(q) ||
           change.sku.toLowerCase().includes(q);
  });

  // Группировка по дням
  const groupedHistory = filteredHistory.reduce((groups, change) => {
    const date = formatDate(change.created_at);
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
      case 'decrease': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'increase': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30';
      case 'match': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    }
  };

  // Статистика
  const stats = {
    total: filteredHistory.length,
    decreases: filteredHistory.filter(c => c.change_type === 'decrease').length,
    increases: filteredHistory.filter(c => c.change_type === 'increase').length,
    matches: filteredHistory.filter(c => c.change_type === 'match').length,
  };

  if (userLoading || loading) {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Загрузка истории...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <a
          href="/app/auto-pricing"
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </a>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">История изменений</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-base mt-0.5 sm:mt-1 hidden sm:block">Все автоматические корректировки цен</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Всего</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-red-600 dark:text-red-400 mb-0.5 sm:mb-1">
            <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Снижения</span>
            <span className="sm:hidden">Сниж.</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.decreases}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mb-0.5 sm:mb-1">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Повышения</span>
            <span className="sm:hidden">Повыш.</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.increases}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1">
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Паритет
          </div>
          <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.matches}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm mb-4 sm:mb-6">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-11 pr-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setTypeFilter('decrease')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                typeFilter === 'decrease' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <TrendingDown className="w-3 h-3" />
              <span className="hidden sm:inline">Снижения</span>
            </button>
            <button
              onClick={() => setTypeFilter('increase')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                typeFilter === 'increase' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span className="hidden sm:inline">Повышения</span>
            </button>
            <button
              onClick={() => setTypeFilter('match')}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                typeFilter === 'match' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Все время</option>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm p-8 sm:p-12 text-center">
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">История пуста</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchQuery || typeFilter !== 'all' || dateFilter !== 'all'
                ? 'Попробуйте изменить параметры поиска'
                : 'Изменения цен будут отображаться здесь после работы крона'}
            </p>
          </div>
        ) : (
          Object.entries(groupedHistory).map(([date, changes]) => (
            <div key={date}>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{date}</div>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{changes.length} изм.</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {changes.map(change => (
                    <div key={change.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      {/* Mobile Layout */}
                      <div className="sm:hidden">
                        <div className="flex items-start gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${getChangeColor(change.change_type)}`}>
                            {getChangeIcon(change.change_type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{change.product_name || change.sku}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{formatTime(change.created_at)}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs mb-1">
                              <span className="text-gray-400 dark:text-gray-500 line-through">
                                {(change.old_price / 1000).toFixed(0)}к
                              </span>
                              <span className="text-gray-400 dark:text-gray-500">&rarr;</span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {(change.new_price / 1000).toFixed(0)}к ₸
                              </span>
                              <span className={`font-medium ${
                                change.change_type === 'decrease' ? 'text-red-600 dark:text-red-400' :
                                change.change_type === 'increase' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                              }`}>
                                ({change.change_type === 'decrease' ? '-' : change.change_type === 'increase' ? '+' : ''}
                                {(Math.abs(change.new_price - change.old_price) / 1000).toFixed(0)}к)
                              </span>
                            </div>

                            {change.competitor_name && (
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {change.competitor_name}{change.competitor_price ? ` (${(change.competitor_price / 1000).toFixed(0)}к ₸)` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:block">
                        <div className="flex items-center gap-3 lg:gap-4">
                          {/* Time */}
                          <div className="w-12 lg:w-16 text-center">
                            <div className="text-xs lg:text-sm font-medium text-gray-900 dark:text-white">
                              {formatTime(change.created_at)}
                            </div>
                          </div>

                          {/* Change Type Icon */}
                          <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center ${getChangeColor(change.change_type)}`}>
                            {getChangeIcon(change.change_type)}
                          </div>

                          {/* Product */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm truncate">{change.product_name || change.sku}</div>
                            <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 font-mono">{change.sku}</div>
                          </div>

                          {/* Price Change */}
                          <div className="text-right">
                            <div className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
                              <span className="text-gray-400 dark:text-gray-500 line-through hidden lg:inline">
                                {change.old_price.toLocaleString('ru-RU')} ₸
                              </span>
                              <span className="text-gray-400 dark:text-gray-500 line-through lg:hidden">
                                {(change.old_price / 1000).toFixed(0)}к
                              </span>
                              <span className="text-gray-400 dark:text-gray-500">&rarr;</span>
                              <span className="font-bold text-gray-900 dark:text-white hidden lg:inline">
                                {change.new_price.toLocaleString('ru-RU')} ₸
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white lg:hidden">
                                {(change.new_price / 1000).toFixed(0)}к
                              </span>
                            </div>
                            <div className={`text-[10px] lg:text-xs font-medium ${
                              change.change_type === 'decrease' ? 'text-red-600 dark:text-red-400' :
                              change.change_type === 'increase' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                            }`}>
                              {change.change_type === 'decrease' ? '-' : change.change_type === 'increase' ? '+' : ''}
                              {Math.abs(change.new_price - change.old_price).toLocaleString('ru-RU')} ₸
                            </div>
                          </div>

                          {/* Competitor */}
                          {change.competitor_name && (
                            <div className="w-28 lg:w-32 text-right hidden lg:block">
                              <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">Конкурент</div>
                              <div className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
                                {change.competitor_price ? `${change.competitor_price.toLocaleString('ru-RU')} ₸` : '—'}
                              </div>
                              <div className="text-[10px] lg:text-xs text-gray-400 dark:text-gray-500 truncate" title={change.competitor_name}>
                                {change.competitor_name}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Reason */}
                        {change.reason && (
                          <div className="mt-2 ml-20 lg:ml-24 text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 hidden lg:block">
                            {change.reason}
                          </div>
                        )}
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
