'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { Plus, Trash2, Calendar, Search, Package, ChevronDown, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface OperationalExpense {
  id: string;
  name: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  productId?: string | null;
  productGroup?: string | null;
}

interface Product {
  kaspi_id: string;
  name: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');

export default function ExpensesPage() {
  const { user, loading: userLoading } = useUser();

  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<{ slug: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date('2026-01-01'));
  const [endDate, setEndDate] = useState<Date>(new Date('2026-01-31'));
  const [productId, setProductId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/operational-expenses?userId=${user.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setExpenses(json.data.map((e: any) => ({
          id: e.id,
          name: e.name,
          amount: e.amount,
          startDate: new Date(e.start_date || e.startDate),
          endDate: new Date(e.end_date || e.endDate),
          productId: e.product_id || null,
          productGroup: e.product_group || null,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchProducts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/products?userId=${user.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setProducts(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, [user?.id]);

  const fetchGroups = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/product-groups?userId=${user.id}`);
      const json = await res.json();
      if (json.success) setGroups(json.data);
    } catch (err) { console.error('Failed to fetch groups:', err); }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && !userLoading) {
      fetchExpenses();
      fetchProducts();
      fetchGroups();
    }
  }, [user?.id, userLoading, fetchExpenses, fetchProducts, fetchGroups]);

  const handleAdd = async () => {
    if (!name || !amount || !user?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/operational-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name,
          amount: parseFloat(amount),
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          productId: productId || null,
          productGroup: groupId || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchExpenses();
        setName('');
        setAmount('');
        setProductId(null);
        setGroupId(null);
        setProductSearch('');
      }
    } catch (err) {
      console.error('Failed to add expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    try {
      await fetch(`/api/operational-expenses?userId=${user.id}&id=${id}`, { method: 'DELETE' });
      await fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const getProductName = (pid: string | null | undefined) => {
    if (!pid) return null;
    return products.find(p => p.kaspi_id === pid)?.name || pid;
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const periodDays = (e: OperationalExpense) =>
    Math.ceil((e.endDate.getTime() - e.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Операционные расходы
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Управление регулярными расходами бизнеса
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Всего расходов</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{fmt(totalExpenses)} ₸</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Записей</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{expenses.length}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Привязано к товарам</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{expenses.filter(e => e.productId).length}</div>
            </div>
          </div>

          {/* Add Expense Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Добавить расход</h2>
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 w-72 bg-gray-900 text-white text-xs rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-xl">
                  <p className="font-medium mb-1.5">Как заполнять:</p>
                  <ul className="space-y-1 text-gray-300">
                    <li><span className="text-white font-medium">Название</span> — тип расхода (Зарплата, Аренда, Внешний трафик)</li>
                    <li><span className="text-white font-medium">Сумма</span> — общая сумма за весь период</li>
                    <li><span className="text-white font-medium">Товар</span> — если расход на конкретный товар (реклама, трафик). Не выбирайте если расход общий</li>
                    <li><span className="text-white font-medium">Период</span> — даты за которые был расход. Сумма автоматически распределится по дням</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Name */}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название (например: Зарплата, Внешний трафик)"
                className="sm:col-span-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />

              {/* Amount */}
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Сумма за период"
                className="px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />

              {/* Product Selector */}
              <div className="relative">
                <button
                  onClick={() => { setShowProductDropdown(!showProductDropdown); setShowCalendar(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm hover:border-indigo-500 transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {groupId ? `Группа: ${groups.find(g => g.slug === groupId)?.name || groupId}`
                      : productId ? getProductName(productId)
                      : 'Общий расход (без товара)'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showProductDropdown ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showProductDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-20 max-h-64 overflow-hidden flex flex-col"
                    >
                      <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Поиск товара..."
                            className="w-full bg-transparent text-xs text-gray-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-52">
                        <button
                          onClick={() => { setProductId(null); setGroupId(null); setShowProductDropdown(false); setProductSearch(''); }}
                          className={`w-full text-left px-3 py-2.5 text-xs hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors ${!productId && !groupId ? 'bg-indigo-50 dark:bg-gray-600 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          Общий расход (без товара)
                        </button>
                        {groups.map(g => (
                          <button
                            key={g.slug}
                            onClick={() => { setProductId(null); setGroupId(g.slug); setShowProductDropdown(false); setProductSearch(''); }}
                            className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${groupId === g.slug ? 'font-medium' : ''}`}
                            style={{ color: g.color }}
                          >
                            Группа: {g.name}
                          </button>
                        ))}
                        <div className="border-t border-gray-100 dark:border-gray-600 my-1" />
                        {filteredProducts.map(p => (
                          <button
                            key={p.kaspi_id}
                            onClick={() => { setProductId(p.kaspi_id); setGroupId(null); setShowProductDropdown(false); setProductSearch(''); }}
                            className={`w-full text-left px-3 py-2.5 text-xs hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors truncate ${productId === p.kaspi_id ? 'bg-indigo-50 dark:bg-gray-600 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                          >
                            {p.name}
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="px-3 py-4 text-xs text-gray-400 text-center">Товары не найдены</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Period */}
              <div className="relative">
                <button
                  onClick={() => { setShowCalendar(!showCalendar); setShowProductDropdown(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm hover:border-indigo-500 transition-colors"
                >
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {format(startDate, 'd MMM', { locale: ru })} — {format(endDate, 'd MMM yyyy', { locale: ru })}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showCalendar && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-3 z-20"
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Быстрый выбор:</div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[
                          { label: 'Январь', s: '2026-01-01', e: '2026-01-31' },
                          { label: 'Февраль', s: '2026-02-01', e: '2026-02-28' },
                          { label: 'Q1 2026', s: '2026-01-01', e: '2026-03-31' },
                          { label: 'Год 2026', s: '2026-01-01', e: '2026-12-31' },
                        ].map(p => (
                          <button
                            key={p.label}
                            onClick={() => { setStartDate(new Date(p.s)); setEndDate(new Date(p.e)); setShowCalendar(false); }}
                            className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-600 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-700 dark:text-gray-300 hover:text-indigo-700 dark:hover:text-indigo-400 rounded-lg text-xs font-medium transition-colors"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Или введите даты:</div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 mb-1 block">От</label>
                          <input
                            type="date"
                            value={format(startDate, 'yyyy-MM-dd')}
                            onChange={(e) => setStartDate(new Date(e.target.value))}
                            className="w-full px-2 py-1.5 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 mb-1 block">До</label>
                          <input
                            type="date"
                            value={format(endDate, 'yyyy-MM-dd')}
                            onChange={(e) => setEndDate(new Date(e.target.value))}
                            className="w-full px-2 py-1.5 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCalendar(false)}
                        className="w-full mt-3 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Применить
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Daily breakdown */}
              {amount && (
                <div className="sm:col-span-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg">
                  ≈ {fmt(parseFloat(amount) / (Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1))} ₸ в день
                </div>
              )}

              {/* Add Button */}
              <button
                onClick={handleAdd}
                disabled={!name || !amount || saving}
                className="sm:col-span-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Добавляю...' : 'Добавить'}
              </button>
            </div>
          </div>

          {/* Expenses List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Текущие расходы</h2>
            </div>

            {expenses.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет добавленных расходов</p>
                <p className="text-xs mt-1">Добавьте первый расход через форму выше</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {expenses.map(expense => {
                  const days = periodDays(expense);
                  const daily = expense.amount / days;
                  const pName = getProductName(expense.productId);
                  return (
                    <div key={expense.id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">{expense.name}</span>
                            {pName && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                                {pName}
                              </span>
                            )}
                            {expense.productGroup && (() => {
                              const g = groups.find(gr => gr.slug === expense.productGroup);
                              return g ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: g.color, backgroundColor: g.color + '15' }}>{g.name}</span>
                              ) : (
                                <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{expense.productGroup}</span>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(expense.startDate, 'd MMM', { locale: ru })} — {format(expense.endDate, 'd MMM yyyy', { locale: ru })}
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400">{fmt(daily)} ₸/день</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {fmt(expense.amount)} ₸
                          </div>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
