'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, DollarSign, TrendingUp, Calculator, Calendar, ChevronDown, ChevronRight, ChevronUp, Package, CheckCircle, AlertTriangle, XCircle, Truck, Star, MessageCircle, ThumbsUp, Plus, X, Trash2, HelpCircle, BarChart3, RotateCcw } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { getSmoothPath } from '@/lib/smoothPath';

// Компонент подсказки (кликабельный для мобильных)
const HelpTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help flex-shrink-0" />
      </button>
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg w-[180px] text-left z-[9999] shadow-xl">
          <span className="whitespace-normal break-words leading-relaxed">{text}</span>
          <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import DateRangeCalendar from '@/components/DateRangeCalendar';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

// Тип товара проданного за день
interface DayProduct {
  code: string;
  name: string;
  qty: number;
  revenue: number;
  costPrice: number;
  price?: number;
}

// Типы для аналитики
interface DailyData {
  date: string;
  fullDate: Date;
  day: string;
  orders: number;
  revenue: number;
  cost: number;
  advertising: number;
  commissions: number;
  tax: number;
  delivery: number;
  profit: number;
  totalExpenses?: number;
  products?: DayProduct[];
}

interface TopProduct {
  id: number;
  name: string;
  sku: string;
  image: string;
  sales: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface MonthlyData {
  date: string;
  fullDate?: Date;
  day?: string;
  orders: number;
  revenue: number;
  cost: number;
  advertising: number;
  commissions: number;
  tax: number;
  delivery: number;
  profit: number;
  totalExpenses?: number;
}

// Интерфейс для операционных расходов
interface OperationalExpense {
  id: string;
  name: string;
  amount: number;        // Сумма расхода
  startDate: Date;       // Начало периода
  endDate: Date;         // Конец периода
  productId?: string | null;  // kaspi_id товара (null = общий расход)
  productName?: string | null; // название товара для отображения
  productGroup?: string | null; // группа товара (import/production)
}

// Форматирование чисел: полные числа с разделителями (без K/M)
const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');
// Короткий формат для осей графиков (чтобы не перекрывались)
const fmtAxis = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

// Насыщенные но спокойные цвета для источников продаж
const SALES_SOURCE_COLORS = ['#4a90d9', '#e07b4a', '#6b7280']; // Синий (Органика), оранжевый (Реклама), серый (Оффлайн)

// Насыщенные но спокойные цвета для способов доставки
const DELIVERY_COLORS = ['#7b68c9', '#d96b8a', '#4db8a4', '#d4a03d', '#6b7280']; // Фиолетовый, розовый, бирюзовый, горчичный, серый (Оффлайн)


// Пустые данные по умолчанию (пока API не загрузит реальные)
const emptyAnalyticsData = {
  totalOrders: 0,
  totalRevenue: 0,
  totalCost: 0,
  totalAdvertising: 0,
  totalTax: 0,
  totalCommissions: 0,
  totalDelivery: 0,
  totalOperational: 0,
  totalProfit: 0,
  avgOrderValue: 0,
  ordersBySource: { organic: 0, ads: 0, offline: 0 },
  pendingOrders: { count: 0, totalAmount: 0, orders: [] },
  dailyData: [],
  dailyDataByCreation: [],
  topProducts: [],
  ordersByStatus: { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0 },
  returnedOrders: [],
  salesSources: { organic: 0, advertising: 0 },
  deliveryModes: { kaspiDelivery: 0, regional: 0, express: 0, sellerDelivery: 0, pickup: 0 },
  deliveryCities: {} as Record<string, Record<string, number>>,
  marketing: { totalCost: 0, totalGmv: 0, roas: 0, campaigns: [] },
  storeSettings: { commissionRate: 12.5, taxRate: 4.0 },
  operationalExpenses: [],
};

type TabType = 'finances' | 'sales' | 'reviews';

// Компонент-обёртка для Suspense
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}

// Скелетон загрузки
function AnalyticsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 h-24"></div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-80"></div>
        </div>
      </div>
    </div>
  );
}

// Основной контент страницы
function AnalyticsPageContent() {
  const { user, loading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['finances', 'sales', 'reviews'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'finances';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Данные из API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiData, setApiData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setDataLoading(true);
      const res = await fetch(`/api/analytics?userId=${user.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        // Преобразуем fullDate строки в Date объекты
        const data = json.data;
        if (data.dailyData) {
          data.dailyData = data.dailyData.map((d: any) => ({
            ...d,
            fullDate: new Date(d.fullDate),
          }));
        }
        setApiData(data);
        if (data.topProducts) {
          const groups: Record<string, string | null> = {};
          for (const p of data.topProducts) {
            if (p.sku) groups[p.sku] = p.group || null;
          }
          setProductGroups(groups);
        }
        if (data.productGroupsMeta) {
          setGroupsMeta(data.productGroupsMeta);
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && !userLoading) {
      fetchAnalyticsData();
    }
  }, [user?.id, userLoading, fetchAnalyticsData]);

  // Инициализация с периодом "Неделя" по умолчанию
  const getDefaultDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // 6 дней назад + сегодня = 7 дней
    return { start: weekStart, end: today };
  };

  const defaultDates = getDefaultDateRange();
  const [startDate, setStartDate] = useState<Date | null>(defaultDates.start);
  const [endDate, setEndDate] = useState<Date | null>(defaultDates.end);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<DailyData | null>(null);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Toggle состояния для линий графика
  const [showPreviousPeriod, setShowPreviousPeriod] = useState(false);
  const [showRevenueLine, setShowRevenueLine] = useState(true);
  const [showExpensesLine, setShowExpensesLine] = useState(true);
  const [showProfitLine, setShowProfitLine] = useState(true);
  const [showChartHelp, setShowChartHelp] = useState(false);

  // Toggle для показа только рекламных заказов
  const [showAdsOnly, setShowAdsOnly] = useState(false);

  // Toggle для рентабельности - только реклама или все продажи
  const [showAdsOnlyROI, setShowAdsOnlyROI] = useState(true);

  // Сортировка и фильтрация товаров
  const [productSort, setProductSort] = useState<'margin' | 'profit' | 'revenue' | 'quantity'>('revenue');
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 10;
  const [productGroups, setProductGroups] = useState<Record<string, string | null>>({});
  const [groupsMeta, setGroupsMeta] = useState<Array<{ slug: string; name: string; color: string }>>([]);

  // Состояние сворачиваемых секций в табе Sales
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    revenue: false,      // Структура выручки
    sources: false,      // Источники продаж и способы доставки
    adProducts: false    // Рентабельность по товарам
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Модальное окно для возвратов
  const [showReturnsModal, setShowReturnsModal] = useState(false);

  // Попап для детализации из таблицы "Детализация по дням"
  const [showTableDayPopup, setShowTableDayPopup] = useState(false);
  const [selectedTableDay, setSelectedTableDay] = useState<DailyData | null>(null);
  const [showTotalPopup, setShowTotalPopup] = useState(false);

  // Попапы для источников продаж
  const [showOrganicPopup, setShowOrganicPopup] = useState(false);
  const [showAdsPopup, setShowAdsPopup] = useState(false);


  // Попап для способов доставки (разбивка по городам)
  const [deliveryPopup, setDeliveryPopup] = useState<{ name: string; key: string; color: string } | null>(null);

  // Попап детализации по товару
  const [showProductPopup, setShowProductPopup] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedProduct, setSelectedProduct] = useState<TopProduct | null>(null);
  const [productPopupPeriod, setProductPopupPeriod] = useState<'week' | 'month' | '3months'>('week');

  // Попап заказов в пути (ожидают поступления)
  const [showPendingOrdersPopup, setShowPendingOrdersPopup] = useState(false);

  // Операционные расходы (загружаются из API)
  const [operationalExpenses, setOperationalExpenses] = useState<OperationalExpense[]>([]);
  const [showExpensesPopup, setShowExpensesPopup] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseStartDate, setNewExpenseStartDate] = useState<Date>(new Date('2026-01-01'));
  const [newExpenseEndDate, setNewExpenseEndDate] = useState<Date>(new Date('2026-01-31'));
  const [showExpenseCalendar, setShowExpenseCalendar] = useState(false);
  const [newExpenseProductId, setNewExpenseProductId] = useState<string | null>(null);
  const [newExpenseGroupId, setNewExpenseGroupId] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<Array<{ kaspi_id: string; name: string }>>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [expenseProductSearch, setExpenseProductSearch] = useState('');

  // Загрузка списка товаров для dropdown
  const fetchProductsList = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/products?userId=${user.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setProductsList(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && !userLoading) {
      fetchProductsList();
    }
  }, [user?.id, userLoading, fetchProductsList]);

  // Загрузка операционных расходов из API
  const fetchOperationalExpenses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/operational-expenses?userId=${user.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOperationalExpenses(json.data.map((e: any) => ({
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
      console.error('Failed to fetch operational expenses:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && !userLoading) {
      fetchOperationalExpenses();
    }
  }, [user?.id, userLoading, fetchOperationalExpenses]);

  // Функция для добавления нового расхода
  const handleAddExpense = async () => {
    if (newExpenseName && newExpenseAmount && newExpenseStartDate && newExpenseEndDate && user?.id) {
      try {
        const res = await fetch('/api/operational-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            name: newExpenseName,
            amount: parseFloat(newExpenseAmount),
            startDate: newExpenseStartDate.toISOString().split('T')[0],
            endDate: newExpenseEndDate.toISOString().split('T')[0],
            productId: newExpenseProductId || null,
            productGroup: newExpenseGroupId || null,
          }),
        });
        const json = await res.json();
        if (json.success) {
          await fetchOperationalExpenses();
          setNewExpenseName('');
          setNewExpenseAmount('');
          setNewExpenseStartDate(new Date('2026-01-01'));
          setNewExpenseEndDate(new Date('2026-01-31'));
          setNewExpenseProductId(null);
          setNewExpenseGroupId(null);
          setExpenseProductSearch('');
        }
      } catch (err) {
        console.error('Failed to add expense:', err);
      }
    }
  };

  // Функция для удаления расхода
  const handleDeleteExpense = async (id: string) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/operational-expenses?userId=${user.id}&id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setOperationalExpenses(operationalExpenses.filter(exp => exp.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  // === Маркетинг за выбранный период (отдельный запрос) ===
  const [periodMarketingCost, setPeriodMarketingCost] = useState<number>(0);

  const toLocalDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const fetchPeriodMarketing = useCallback(async () => {
    if (!user?.id || !startDate || !endDate) return;
    try {
      const res = await fetch(`/api/kaspi/marketing?userId=${user.id}&startDate=${toLocalDate(startDate)}&endDate=${toLocalDate(endDate)}`);
      const json = await res.json();
      if (json.success && json.data?.summary) {
        setPeriodMarketingCost(json.data.summary.totalCost || 0);
      } else {
        setPeriodMarketingCost(0);
      }
    } catch {
      // Marketing might not be connected
      setPeriodMarketingCost(0);
    }
  }, [user?.id, startDate, endDate]);

  useEffect(() => {
    fetchPeriodMarketing();
  }, [fetchPeriodMarketing]);

  // Рассчитать дневную сумму операционных расходов для конкретной даты
  const calculateDailyOperationalExpensesForDate = (date: Date) => {
    return operationalExpenses.reduce((total, expense) => {
      // Проверяем, попадает ли дата в период расхода
      if (date >= expense.startDate && date <= expense.endDate) {
        // Количество дней в периоде расхода
        const periodDays = Math.ceil((expense.endDate.getTime() - expense.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + expense.amount / periodDays;
      }
      return total;
    }, 0);
  };

  // Рассчитать общую сумму операционных расходов в месяц (для отображения)
  const calculateMonthlyOperationalExpenses = () => {
    return operationalExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  // Рассчитать среднюю дневную сумму (для отображения)
  const calculateAverageDailyExpenses = () => {
    if (operationalExpenses.length === 0) return 0;
    let totalDailyAmount = 0;
    operationalExpenses.forEach(expense => {
      const periodDays = Math.ceil((expense.endDate.getTime() - expense.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalDailyAmount += expense.amount / periodDays;
    });
    return totalDailyAmount;
  };

  // Закрытие календаря по клику вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const handleApplyDateRange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    setShowCalendar(false);
  };

  const handleQuickFilter = (type: 'yesterday' | 'week' | 'month' | 'year') => {
    // Текущая дата (сегодня) - автоматически обновляется
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Сбрасываем время до начала дня

    switch (type) {
      case 'yesterday':
        // Показываем вчерашний день
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case 'week':
        // Последние 7 дней
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6); // 6 дней назад + сегодня = 7 дней
        setStartDate(weekStart);
        setEndDate(today);
        break;
      case 'month':
        // Последние 30 дней
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 29); // 29 дней назад + сегодня = 30 дней
        setStartDate(monthStart);
        setEndDate(today);
        break;
      case 'year':
        // Весь год - все доступные данные (с 1 октября 2025)
        const yearStart = new Date('2025-10-01');
        setStartDate(yearStart);
        setEndDate(today);
        break;
    }
  };

  // Обработчик клика по столбцу графика
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (data: any) => {
    console.log('Bar clicked:', data); // Для отладки

    // Recharts передает данные напрямую в event handler
    if (data && data.fullDate) {
      setSelectedDayData(data as DailyData);
      setShowDayPopup(true);
    } else if (data && data.activePayload && data.activePayload[0]) {
      const dayData = data.activePayload[0].payload;
      // Проверяем, что это данные за день (не месяц)
      if (dayData.fullDate) {
        setSelectedDayData(dayData as DailyData);
        setShowDayPopup(true);
      }
    }
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return 'Выберите период';
    if (startDate.getTime() === endDate.getTime()) {
      return format(startDate, 'd MMMM yyyy', { locale: ru });
    }
    return `${format(startDate, 'd MMM', { locale: ru })} - ${format(endDate, 'd MMM yyyy', { locale: ru })}`;
  };

  // Короткий формат периода для карточек
  const formatShortPeriod = () => {
    if (!startDate || !endDate) return '';
    if (startDate.getTime() === endDate.getTime()) {
      return format(startDate, 'd MMM', { locale: ru });
    }
    // Проверяем, в одном ли году даты
    if (startDate.getFullYear() === endDate.getFullYear()) {
      return `${format(startDate, 'd MMM', { locale: ru })} – ${format(endDate, 'd MMM', { locale: ru })}`;
    }
    return `${format(startDate, 'd MMM yy', { locale: ru })} – ${format(endDate, 'd MMM yy', { locale: ru })}`;
  };

  // Функция для группировки данных по месяцам
  const groupByMonth = (data: DailyData[]) => {
    const monthMap = new Map<string, MonthlyData>();

    data.forEach(day => {
      // Формируем ключ как "YYYY-MM" для правильной сортировки
      const monthKey = format(day.fullDate, 'yyyy-MM');
      const monthLabel = format(day.fullDate, 'MMM yy', { locale: ru });

      if (!monthMap.has(monthKey)) {
        // Берём первый день месяца для fullDate
        const firstDayOfMonth = new Date(day.fullDate.getFullYear(), day.fullDate.getMonth(), 1);
        monthMap.set(monthKey, {
          date: monthLabel,
          fullDate: firstDayOfMonth,
          orders: 0,
          revenue: 0,
          cost: 0,
          advertising: 0,
          commissions: 0,
          tax: 0,
          delivery: 0,
          totalExpenses: 0,
          profit: 0,
        });
      }

      const monthData = monthMap.get(monthKey);
      if (monthData) {
        monthData.orders += day.orders;
        monthData.revenue += day.revenue;
        monthData.cost += day.cost;
        monthData.advertising += day.advertising;
        monthData.commissions += day.commissions;
        monthData.tax += day.tax;
        monthData.delivery += day.delivery;
        monthData.totalExpenses = (monthData.totalExpenses || 0) + (day.totalExpenses || 0);
        monthData.profit += day.profit;
      }
    });

    // Сортируем по ключу (хронологически)
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, value]) => value);
  };

  // Источник данных: API или mock
  const sourceData = apiData || emptyAnalyticsData;

  // Фильтрация данных по выбранному периоду
  const getFilteredData = () => {
    const allDailyData = (sourceData.dailyData || []).map((day: any) => {
      const totalExpenses = (day.cost || 0) + (day.advertising || 0) + (day.tax || 0) + (day.commissions || 0) + (day.delivery || 0);
      const recalculatedProfit = (day.revenue || 0) - totalExpenses;
      return {
        ...day,
        fullDate: day.fullDate instanceof Date ? day.fullDate : new Date(day.fullDate),
        totalExpenses,
        profit: recalculatedProfit,
      };
    });

    // dailyDataByCreation — по дате создания заказа (для "Структура выручки")
    const allDailyDataByCreation = (sourceData.dailyDataByCreation || sourceData.dailyData || []).map((day: any) => {
      const totalExpenses = (day.cost || 0) + (day.advertising || 0) + (day.tax || 0) + (day.commissions || 0) + (day.delivery || 0);
      const recalculatedProfit = (day.revenue || 0) - totalExpenses;
      return {
        ...day,
        fullDate: day.fullDate instanceof Date ? day.fullDate : new Date(day.fullDate),
        totalExpenses,
        profit: recalculatedProfit,
      };
    });

    if (!startDate || !endDate) {
      return {
        ...sourceData,
        dailyData: allDailyData,
        dailyDataByCreation: allDailyDataByCreation,
      };
    }

    // Фильтруем dailyData по выбранному периоду
    const startTime = new Date(startDate);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(endDate);
    endTime.setHours(23, 59, 59, 999);

    const filteredDailyData = allDailyData.filter((day: DailyData) => {
      const dayDate = new Date(day.fullDate);
      dayDate.setHours(12, 0, 0, 0);
      return dayDate >= startTime && dayDate <= endTime;
    });

    const filteredDailyDataByCreation = allDailyDataByCreation.filter((day: DailyData) => {
      const dayDate = new Date(day.fullDate);
      dayDate.setHours(12, 0, 0, 0);
      return dayDate >= startTime && dayDate <= endTime;
    });

    // Проверяем, если период больше 31 дня - группируем по месяцам
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const chartData = daysDifference > 31 ? groupByMonth(filteredDailyData) : filteredDailyData;
    const chartDataByCreation = daysDifference > 31 ? groupByMonth(filteredDailyDataByCreation) : filteredDailyDataByCreation;

    // Пересчитываем метрики на основе отфильтрованных данных
    const totalOrders = filteredDailyData.reduce((sum: number, day: DailyData) => sum + day.orders, 0);
    const totalRevenue = filteredDailyData.reduce((sum: number, day: DailyData) => sum + day.revenue, 0);
    const totalCost = filteredDailyData.reduce((sum: number, day: DailyData) => sum + (day.cost || 0), 0);
    const totalAdvertising = filteredDailyData.reduce((sum: number, day: DailyData) => sum + (day.advertising || 0), 0);
    const totalCommissions = filteredDailyData.reduce((sum: number, day: DailyData) => sum + (day.commissions || 0), 0);
    const totalTax = filteredDailyData.reduce((sum: number, day: DailyData) => sum + (day.tax || 0), 0);
    const totalDelivery = filteredDailyData.reduce((sum: number, day: DailyData) => sum + (day.delivery || 0), 0);
    const totalProfit = filteredDailyData.reduce((sum: number, day: DailyData) => sum + day.profit, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Rebuild topProducts from filtered daily data (by creation date — consistent with top cards)
    const allTopProducts = sourceData.topProducts || [];
    const periodProductSales = new Map<string, { name: string; qty: number; revenue: number; costPrice: number }>();
    for (const day of filteredDailyDataByCreation) {
      if (day.products && Array.isArray(day.products)) {
        for (const p of day.products) {
          const key = p.code || p.name;
          const ex = periodProductSales.get(key);
          if (ex) {
            ex.qty += p.qty || 0;
            ex.revenue += p.revenue || 0;
            ex.costPrice += p.costPrice || 0;
          } else {
            periodProductSales.set(key, { name: p.name, qty: p.qty || 0, revenue: p.revenue || 0, costPrice: p.costPrice || 0 });
          }
        }
      }
    }

    // Merge with original topProducts metadata (adCost, group, etc.)
    const origMap = new Map<string, any>();
    for (const p of allTopProducts) origMap.set(p.sku, p);

    const periodTotalRevenue = Array.from(periodProductSales.values()).reduce((s, p) => s + p.revenue, 0);
    const creationTotalDelivery = filteredDailyDataByCreation.reduce((sum: number, day: DailyData) => sum + (day.delivery || 0), 0);
    const storeCommRate = (sourceData.storeSettings?.commissionRate ?? 12.5) / 100;
    const storeTaxRate = (sourceData.storeSettings?.taxRate ?? 4.0) / 100;

    const filteredTopProducts = Array.from(periodProductSales.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 50)
      .map(([code, d], idx) => {
        const orig = origMap.get(code) || {};
        const revenueShare = periodTotalRevenue > 0 ? d.revenue / periodTotalRevenue : 0;
        const commission = d.revenue * storeCommRate;
        const tax = d.revenue * storeTaxRate;
        const delivery = creationTotalDelivery * revenueShare;
        const adCost = orig.adCost || 0;
        const profit = d.revenue - d.costPrice - commission - tax - delivery - adCost;
        const margin = d.revenue > 0 ? (profit / d.revenue) * 100 : 0;
        return {
          ...orig,
          id: String(idx + 1),
          name: d.name,
          sku: code,
          sales: d.qty,
          revenue: d.revenue,
          costPrice: d.costPrice,
          commission,
          tax,
          delivery,
          profit,
          margin,
        };
      });

    return {
      totalOrders,
      totalRevenue,
      totalCost,
      totalAdvertising,
      totalCommissions,
      totalTax,
      totalDelivery,
      totalProfit,
      avgOrderValue,
      dailyData: chartData,
      dailyDataByCreation: chartDataByCreation,
      topProducts: filteredTopProducts,
      ordersByStatus: sourceData.ordersByStatus || { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0 },
      salesSources: sourceData.salesSources || { organic: totalOrders, advertising: 0 },
      ordersBySource: sourceData.ordersBySource || { organic: totalOrders, ads: 0, offline: 0 },
      deliveryModes: sourceData.deliveryModes || { kaspiDelivery: 0, regional: 0, express: 0, sellerDelivery: 0, pickup: 0 },
      deliveryCities: sourceData.deliveryCities || {},
      pendingOrders: sourceData.pendingOrders || { count: 0, totalAmount: 0, orders: [] },
      marketing: sourceData.marketing || { totalCost: 0, totalGmv: 0, roas: 0, campaigns: [] },
      totalOperational: sourceData.totalOperational || 0,
      storeSettings: sourceData.storeSettings || { commissionRate: 12.5, taxRate: 4.0 },
      operationalExpenses: sourceData.operationalExpenses || [],
    };
  };

  // Используем отфильтрованные данные
  const data = getFilteredData();

  // Итоги по дате СОЗДАНИЯ заказа (для таба Sales — согласовано с графиком "Структура выручки")
  const creationTotals = (() => {
    const days = data.dailyDataByCreation || data.dailyData || [];
    const totalOrders = days.reduce((s: number, d: any) => s + (d.orders || 0), 0);
    const totalRevenue = days.reduce((s: number, d: any) => s + (d.revenue || 0), 0);
    const totalReturned = days.reduce((s: number, d: any) => s + (d.returned || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalOrders, totalRevenue, avgOrderValue, totalReturned };
  })();

  // Функция для получения данных предыдущего периода
  const getPreviousPeriodData = () => {
    if (!startDate || !endDate) return [];

    // Вычисляем длительность текущего периода
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Вычисляем начало и конец предыдущего периода
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(startDate.getDate() - 1);

    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevEndDate.getDate() - periodLength + 1);

    // Фильтруем данные для предыдущего периода
    const allSourceDailyData = (sourceData.dailyData || []).map((d: any) => ({
      ...d,
      fullDate: d.fullDate instanceof Date ? d.fullDate : new Date(d.fullDate),
    }));
    const prevPeriodData = allSourceDailyData
      .filter((day: any) => {
        const dayDate = day.fullDate;
        return dayDate >= prevStartDate && dayDate <= prevEndDate;
      })
      .map((day: any, index: number) => {
        const totalExpenses = (day.cost || 0) + (day.advertising || 0) + (day.tax || 0) + (day.commissions || 0) + (day.delivery || 0);
        const recalculatedProfit = (day.revenue || 0) - totalExpenses;

        // Используем индекс для сопоставления с текущим периодом на графике
        const currentPeriodDay = data.dailyData[index];
        const dateLabel = currentPeriodDay ? currentPeriodDay.date : day.date;

        return {
          ...day,
          date: dateLabel, // Используем метку даты текущего периода для правильного отображения
          totalExpenses,
          profit: recalculatedProfit,
          // Добавляем префикс для легенды
          prevRevenue: day.revenue,
          prevExpenses: totalExpenses,
          prevProfit: recalculatedProfit
        };
      });

    return prevPeriodData;
  };

  const previousPeriodData = showPreviousPeriod ? getPreviousPeriodData() : [];

  // Объединяем текущие данные с предыдущим периодом для графика
  const combinedChartData = data.dailyData.map((currentDay: any, index: number) => {
    const prevDay = previousPeriodData[index];
    return {
      ...currentDay,
      prevRevenue: prevDay?.prevRevenue || null,
      prevExpenses: prevDay?.prevExpenses || null,
      prevProfit: prevDay?.prevProfit || null,
    };
  });

  // Подготовка данных для графиков
  // Оффлайн = 5% от общего числа заказов (ручные заказы)
  const salesSourcesData = [
    { name: 'Органика', value: data.salesSources.organic },
    { name: 'Реклама', value: data.salesSources.advertising },
  ];

  const deliveryData = [
    { name: 'Kaspi Доставка', value: data.deliveryModes.kaspiDelivery, key: 'kaspiDelivery' },
    { name: 'Межгород', value: data.deliveryModes.regional, key: 'regional' },
    { name: 'Экспресс', value: data.deliveryModes.express || 0, key: 'express' },
    { name: 'Моя доставка', value: data.deliveryModes.sellerDelivery, key: 'sellerDelivery' },
    { name: 'Самовывоз', value: data.deliveryModes.pickup, key: 'pickup' },
  ].filter(d => d.value > 0 || ['kaspiDelivery', 'regional', 'pickup'].includes(d.key));

  // Расчет процента рентабельности
  const profitMargin = ((data.totalProfit / data.totalRevenue) * 100).toFixed(1);

  if (userLoading || dataLoading) {
    return <AnalyticsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="mb-4 lg:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Аналитика</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Детальная статистика по вашим заказам</p>
          </div>

          {/* Tabs - horizontal scroll on mobile */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setActiveTab('finances')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'finances'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Финансы
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'sales'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Заказы и реклама
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'reviews'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Отзывы
                </button>
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-sm relative w-full lg:w-auto" ref={calendarRef}>
              <div className="mb-2 sm:mb-3">
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className={startDate && endDate ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}>
                    {formatDateRange()}
                  </span>
                </button>
              </div>

              {/* Quick Date Filters */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => handleQuickFilter('yesterday')}
                  className="px-2.5 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Вчера
                </button>
                <button
                  onClick={() => handleQuickFilter('week')}
                  className="px-2.5 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Неделя
                </button>
                <button
                  onClick={() => handleQuickFilter('month')}
                  className="px-2.5 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Месяц
                </button>
                <button
                  onClick={() => handleQuickFilter('year')}
                  className="px-2.5 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Год
                </button>
              </div>

              {/* Calendar Dropdown */}
              <AnimatePresence>
                {showCalendar && (
                  <DateRangeCalendar
                    startDate={startDate}
                    endDate={endDate}
                    onApply={handleApplyDateRange}
                    onCancel={() => setShowCalendar(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'finances' && (
          <>
            {/* Period Info */}
            <div className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm text-gray-400 dark:text-gray-500">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Период: <span className="text-gray-500 dark:text-gray-400">{formatShortPeriod()}</span></span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>{startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0} дн.</span>
            </div>

            {/* Finance Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm flex sm:block items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 sm:mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Поступления</span>
                  <HelpTooltip text="Сумма выданных заказов по дате выдачи клиенту" />
                </div>
                <div className="text-right sm:text-left">
                  <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{fmt(data.totalRevenue)} ₸</div>
                  <div className="text-[10px] sm:text-xs mt-1">
                    <span className="bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-medium">{formatShortPeriod()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex sm:block items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 sm:mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 dark:bg-rose-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400 rotate-180" />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Расходы</span>
                  </div>
                  <div className="text-right sm:text-left">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {fmt(data.totalCost + data.totalAdvertising + data.totalTax + data.totalCommissions + data.totalDelivery + (data.totalOperational || 0))} ₸
                    </div>
                    <div className="text-[10px] sm:text-xs mt-1">
                      <button
                        onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                        className="flex items-center gap-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer ml-auto sm:ml-0"
                      >
                        <span>Детали</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showExpenseDetails ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {showExpenseDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Себест.</span>
                          <span className="font-medium">{fmt(data.totalCost)} ₸</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Реклама</span>
                          <span className="font-medium">{fmt(data.totalAdvertising)} ₸</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Налог</span>
                          <span className="font-medium">{fmt(data.totalTax)} ₸</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Комиссия</span>
                          <span className="font-medium">{fmt(data.totalCommissions)} ₸</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Доставка</span>
                          <span className="font-medium">{fmt(data.totalDelivery)} ₸</span>
                        </div>
                        {(data.totalOperational || 0) > 0 && (
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Опер. расх.</span>
                          <span className="font-medium">{fmt(data.totalOperational)} ₸</span>
                        </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm flex sm:block items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 sm:mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Прибыль</span>
                </div>
                <div className="text-right sm:text-left">
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(data.totalProfit)} ₸</div>
                  <div className="text-[10px] sm:text-xs mt-1">
                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">{profitMargin}% маржа</span>
                  </div>
                </div>
              </div>
            </div>

        {/* Financial Charts */}
        <div className="grid grid-cols-1 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {/* Money Flow Chart - Line */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">Движение денег</h3>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium">{formatShortPeriod()}</span>
                {/* Help Icon with Tooltip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowChartHelp(!showChartHelp)}
                    className="focus:outline-none"
                  >
                    <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                  </button>
                </div>
              </div>

              {/* Previous Period Toggle */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Прошлый период</span>
                <button
                  onClick={() => setShowPreviousPeriod(!showPreviousPeriod)}
                  className={`relative inline-flex h-4 w-7 sm:h-6 sm:w-11 items-center rounded-full transition-colors cursor-pointer ${
                    showPreviousPeriod ? 'bg-gray-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                      showPreviousPeriod ? 'translate-x-3 sm:translate-x-6' : 'translate-x-0.5 sm:translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Line Toggle Buttons */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
              <button
                onClick={() => setShowRevenueLine(!showRevenueLine)}
                className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  showRevenueLine
                    ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showRevenueLine ? 'bg-sky-500' : 'bg-gray-300 dark:bg-gray-500'}`} />
                Поступления
              </button>
              <button
                onClick={() => setShowExpensesLine(!showExpensesLine)}
                className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  showExpensesLine
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showExpensesLine ? 'bg-rose-400' : 'bg-gray-300 dark:bg-gray-500'}`} />
                Расходы
              </button>
              <button
                onClick={() => setShowProfitLine(!showProfitLine)}
                className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  showProfitLine
                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showProfitLine ? 'bg-teal-400' : 'bg-gray-300 dark:bg-gray-500'}`} />
                Прибыль
              </button>
            </div>

            <ResponsiveContainer width="100%" height={450} className="!h-[200px] sm:!h-[450px]">
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(value) => fmtAxis(value)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                    padding: '8px 12px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => value !== undefined ? [`${Number(value).toLocaleString('ru-RU')} ₸`, name] : ['']}
                  labelFormatter={(label) => label}
                  labelStyle={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}
                  itemSorter={(item) => {
                    const order: Record<string, number> = { 'revenue': 0, 'totalExpenses': 1, 'profit': 2, 'prevRevenue': 3, 'prevExpenses': 4, 'prevProfit': 5 };
                    return order[item.dataKey as string] ?? 99;
                  }}
                />
                {/* Current Period Lines */}
                {showRevenueLine && (
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Поступления"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ fill: '#0ea5e9', r: 3 }}
                  />
                )}
                {showExpensesLine && (
                  <Line
                    type="monotone"
                    dataKey="totalExpenses"
                    name="Расходы"
                    stroke="#fb7185"
                    strokeWidth={2}
                    dot={{ fill: '#fb7185', r: 3 }}
                  />
                )}
                {showProfitLine && (
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Прибыль"
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    dot={{ fill: '#2dd4bf', r: 3 }}
                  />
                )}
                {/* Previous Period Lines (Dashed) */}
                {showPreviousPeriod && showRevenueLine && (
                  <Line
                    type="monotone"
                    dataKey="prevRevenue"
                    name="Пост. прошл."
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#0ea5e9', r: 2 }}
                    opacity={0.5}
                  />
                )}
                {showPreviousPeriod && showExpensesLine && (
                  <Line
                    type="monotone"
                    dataKey="prevExpenses"
                    name="Расх. прошл."
                    stroke="#fb7185"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#fb7185', r: 2 }}
                    opacity={0.5}
                  />
                )}
                {showPreviousPeriod && showProfitLine && (
                  <Line
                    type="monotone"
                    dataKey="prevProfit"
                    name="Приб. прошл."
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#2dd4bf', r: 2 }}
                    opacity={0.5}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Детализация данных графика */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">Детализация по дням</h3>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium">{formatShortPeriod()}</span>
            </div>
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <table className="w-full text-xs sm:text-sm min-w-[320px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 sm:py-3 px-1 sm:px-2 font-medium text-gray-500 dark:text-gray-400 text-left">Дата</th>
                    <th className="py-2 sm:py-3 px-1 sm:px-2 font-medium text-gray-500 dark:text-gray-400 text-right">Поступ.</th>
                    <th className="py-2 sm:py-3 px-1 sm:px-2 font-medium text-gray-500 dark:text-gray-400 text-right">Расходы</th>
                    <th className="py-2 sm:py-3 px-1 sm:px-2 font-medium text-gray-500 dark:text-gray-400 text-right">Прибыль</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyData.map((day: any, index: number) => {
                    const dayExpenses = day.cost + day.advertising + day.commissions + day.tax + day.delivery;
                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedTableDay({ ...day, totalExpenses: dayExpenses } as DailyData);
                          setShowTableDayPopup(true);
                        }}
                      >
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-900 dark:text-white text-left whitespace-nowrap">{day.date}{day.day ? ` (${day.day})` : ''}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-700 dark:text-gray-300 font-medium text-right whitespace-nowrap">
                          {Math.round(day.revenue).toLocaleString('ru-RU')} ₸
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-700 dark:text-gray-300 font-medium text-right whitespace-nowrap">
                          {Math.round(dayExpenses).toLocaleString('ru-RU')} ₸
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-emerald-600 dark:text-emerald-400 font-medium text-right whitespace-nowrap">
                          {Math.round(day.profit).toLocaleString('ru-RU')} ₸
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    className="bg-gray-50 dark:bg-gray-700 font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                    onClick={() => setShowTotalPopup(true)}
                  >
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-900 dark:text-white text-left whitespace-nowrap">Итого</td>
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-900 dark:text-white text-right whitespace-nowrap">
                      {Math.round(data.totalRevenue).toLocaleString('ru-RU')} ₸
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-900 dark:text-white text-right whitespace-nowrap">
                      {Math.round(data.totalCost + data.totalAdvertising + data.totalCommissions + data.totalTax + data.totalDelivery).toLocaleString('ru-RU')} ₸
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                      {Math.round(data.totalProfit).toLocaleString('ru-RU')} ₸
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <>
            {/* Period Info + кнопка расходов */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-gray-400 dark:text-gray-500">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                <span>Период: <span className="text-gray-500 dark:text-gray-400">{formatShortPeriod()}</span></span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>{data.totalOrders} заказов</span>
              </div>
              <Link
                href="/app/expenses"
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Операционные расходы
              </Link>
            </div>

            {/* Sales Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Заказов</span>
                  <HelpTooltip text="Общее количество заказов за выбранный период" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{fmt(creationTotals.totalRevenue)} ₸</div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {creationTotals.totalOrders} заказов
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Ср. чек</span>
                  <HelpTooltip text="Средняя сумма одного заказа (выручка ÷ количество заказов)" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{fmt(creationTotals.avgOrderValue)} ₸</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowReturnsModal(true)}>
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Возвраты</span>
                  <HelpTooltip text="Процент возвращённых заказов от общего числа" />
                </div>
                {(() => {
                  const returnedCount = creationTotals.totalReturned;
                  const total = creationTotals.totalOrders + returnedCount;
                  const returnPercent = total > 0 ? ((returnedCount / total) * 100).toFixed(1) : '0';
                  return (
                    <>
                      <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{returnPercent}%</div>
                      <div className="text-[10px] sm:text-xs text-gray-400 mt-1">
                        {returnedCount} из {total}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div
                className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setShowPendingOrdersPopup(true)}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">В пути</span>
                  <HelpTooltip text="Заказы в процессе доставки до клиента" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{data.pendingOrders?.count || 0}</div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">{fmt(data.pendingOrders?.totalAmount || 0)} ₸ ожидает</span>
                </div>
              </div>
            </div>

            {/* Orders Chart - Full Width with Cost/Ads/Profit breakdown */}
            <div className="mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl overflow-hidden">
                {/* Заголовок - кликабельный для сворачивания */}
                <div
                  onClick={() => toggleSection('revenue')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Структура выручки</h3>
                      <p className="text-[10px] lg:text-xs text-gray-400">{startDate && endDate ? `${startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <div
                      className="flex flex-col items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[9px] lg:text-xs text-gray-400">{showAdsOnly ? 'реклама' : 'все'}</span>
                      <button
                        onClick={() => setShowAdsOnly(!showAdsOnly)}
                        className={`relative w-8 h-4 lg:w-10 lg:h-5 rounded-full transition-colors cursor-pointer ${
                          showAdsOnly ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 lg:w-4 lg:h-4 bg-white rounded-full shadow-sm transition-transform ${
                          showAdsOnly ? 'translate-x-4 lg:translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    <ChevronUp className={`w-5 h-5 text-gray-400 transition-transform ${collapsedSections.revenue ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Содержимое - сворачиваемое */}
                <AnimatePresence>
                  {!collapsedSections.revenue && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6"
                    >

                {(() => {
                  // Подготовка данных для stacked bar chart (по дате создания заказа)
                  const adsRatio = data.totalOrders > 0 ? data.ordersBySource.ads / data.totalOrders : 0;

                  // Распределяем periodMarketingCost по дням пропорционально выручке
                  const creationDays = data.dailyDataByCreation || data.dailyData;
                  const totalCreationRevenue = creationDays.reduce((s: number, d: any) => s + (d.revenue || 0), 0);

                  const chartData = creationDays.map((day: any) => {
                    const multiplier = showAdsOnly ? adsRatio : 1;
                    const dayRevenue = day.revenue * multiplier;
                    const dayCost = (day.cost || 0) * multiplier;
                    const dayCommissions = (day.commissions || 0) * multiplier;
                    const dayTax = (day.tax || 0) * multiplier;
                    const dayDelivery = (day.delivery || 0) * multiplier;
                    // Реклама: распределяем periodMarketingCost пропорционально выручке
                    const revenueShare = totalCreationRevenue > 0 ? (day.revenue || 0) / totalCreationRevenue : 0;
                    const dayAds = periodMarketingCost * revenueShare;
                    const dayOpExpenses = (day.fullDate ? calculateDailyOperationalExpensesForDate(day.fullDate) : 0) * multiplier;
                    const dayComTaxDel = dayCommissions + dayTax + dayDelivery;
                    const dayProfit = dayRevenue - dayCost - dayComTaxDel - dayAds - dayOpExpenses;

                    return {
                      date: day.date,
                      day: day.day || '',
                      cost: dayCost,
                      comTaxDel: dayComTaxDel,
                      advertising: dayAds,
                      opExpenses: dayOpExpenses,
                      profit: Math.max(0, dayProfit),
                      loss: dayProfit < 0 ? Math.abs(dayProfit) : 0,
                      revenue: dayRevenue,
                      orders: showAdsOnly ? Math.round(day.orders * adsRatio) : day.orders
                    };
                  });

                  // Итоги из chartData (согласованы с графиком)
                  const chartTotalRevenue = chartData.reduce((s: number, d: any) => s + d.revenue, 0);
                  const chartTotalCost = chartData.reduce((s: number, d: any) => s + d.cost, 0);
                  const chartTotalComTaxDel = chartData.reduce((s: number, d: any) => s + d.comTaxDel, 0);
                  const chartTotalAds = chartData.reduce((s: number, d: any) => s + d.advertising, 0);
                  // Опер. расходы: считаем по всем дням периода (не только дни с заказами)
                  let chartTotalOpex = 0;
                  if (startDate && endDate) {
                    for (const exp of operationalExpenses) {
                      const expStart = exp.startDate.getTime();
                      const expEnd = exp.endDate.getTime();
                      const overlapStart = Math.max(expStart, startDate.getTime());
                      const overlapEnd = Math.min(expEnd, endDate.getTime());
                      if (overlapStart > overlapEnd) continue;
                      const overlapDays = Math.round((overlapEnd - overlapStart) / 86400000) + 1;
                      const totalExpDays = Math.max(1, Math.round((expEnd - expStart) / 86400000) + 1);
                      chartTotalOpex += (exp.amount / totalExpDays) * overlapDays;
                    }
                  }
                  const chartTotalProfit = chartTotalRevenue - chartTotalCost - chartTotalComTaxDel - chartTotalAds - chartTotalOpex;
                  const chartTotalOrders = chartData.reduce((s: number, d: any) => s + d.orders, 0);

                  return (
                    <>
                      <ResponsiveContainer width="100%" height={200} className="sm:!h-[220px] lg:!h-[320px]">
                        <BarChart data={chartData} margin={{ top: 30, right: 5, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 12 : 9 }} />
                          <YAxis stroke="#9ca3af" tick={{ fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 12 : 9 }} tickFormatter={(v) => fmtAxis(v)} />
                          <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            wrapperStyle={{ pointerEvents: 'auto', zIndex: 100 }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const item = payload[0]?.payload;
                                const netProfit = (item?.profit || 0) - (item?.loss || 0);
                                return (
                                  <div
                                    className="bg-gray-900 text-white p-2.5 rounded-lg shadow-lg text-xs min-w-[140px]"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                  >
                                    <p className="font-semibold mb-1.5">{label} ({item?.day})</p>
                                    <div className="space-y-0.5">
                                      <div className="flex justify-between gap-3">
                                        <span className="text-gray-400">Выручка</span>
                                        <span className="font-medium">{fmt(item?.revenue || 0)} ₸</span>
                                      </div>
                                      <div className="flex justify-between gap-3">
                                        <span className="text-rose-400">Себест.</span>
                                        <span>{fmt(item?.cost || 0)} ₸</span>
                                      </div>
                                      <div className="flex justify-between gap-3">
                                        <span className="text-blue-400">Комис./Налог/Дост.</span>
                                        <span>{fmt(item?.comTaxDel || 0)} ₸</span>
                                      </div>
                                      <div className="flex justify-between gap-3">
                                        <span className="text-amber-400">Реклама</span>
                                        <span>{fmt(item?.advertising || 0)} ₸</span>
                                      </div>
                                      <div className="flex justify-between gap-3 pt-1 border-t border-gray-700 mt-1">
                                        <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                          {netProfit >= 0 ? 'Прибыль' : 'Убыток'}
                                        </span>
                                        <span className={`font-semibold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {netProfit >= 0 ? '' : '-'}{fmt(Math.abs(netProfit))} ₸
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '13px' : '9px' }}
                            iconSize={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 12 : 8}
                            formatter={(value) => {
                              const labels: Record<string, string> = {
                                cost: 'Себест.',
                                comTaxDel: 'Комис.',
                                advertising: 'Рекл.',
                                opExpenses: 'Опер.',
                                profit: 'Приб.'
                              };
                              return labels[value] || value;
                            }}
                          />
                          <Bar dataKey="cost" name="cost" stackId="a" fill="#f87171" />
                          <Bar dataKey="comTaxDel" name="comTaxDel" stackId="a" fill="#93c5fd" />
                          <Bar dataKey="advertising" name="advertising" stackId="a" fill="#fbbf24" />
                          <Bar dataKey="opExpenses" name="opExpenses" stackId="a" fill="#818cf8" />
                          <Bar dataKey="profit" name="profit" stackId="a" fill="#34d399" radius={[3, 3, 0, 0]}>
                            <LabelList
                              dataKey="revenue"
                              position="top"
                              formatter={(value) => fmtAxis(Number(value))}
                              style={{ fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 11 : 7, fill: '#6b7280', fontWeight: 500 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Итоги под графиком — из chartData (согласованы с графиком) */}
                      <div className="mt-3 lg:mt-4 grid grid-cols-5 gap-1 lg:gap-3">
                        <div className="bg-white dark:bg-gray-800 rounded-lg px-1.5 py-1.5 lg:px-4 lg:py-3 shadow-sm text-center">
                          <div className="text-[9px] lg:text-sm text-gray-400">себест.</div>
                          <div className="text-xs lg:text-base font-semibold text-rose-500 dark:text-rose-400">
                            {fmt(chartTotalCost)} ₸
                          </div>
                          <div className="text-[8px] lg:text-xs text-rose-400">
                            {chartTotalRevenue > 0 ? ((chartTotalCost / chartTotalRevenue) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg px-1.5 py-1.5 lg:px-4 lg:py-3 shadow-sm text-center">
                          <div className="text-[9px] lg:text-sm text-gray-400">реклама</div>
                          <div className="text-xs lg:text-base font-semibold text-amber-500 dark:text-amber-400">
                            {fmt(chartTotalAds)} ₸
                          </div>
                          <div className="text-[8px] lg:text-xs text-amber-400">
                            {chartTotalRevenue > 0 ? ((chartTotalAds / chartTotalRevenue) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg px-1.5 py-1.5 lg:px-4 lg:py-3 shadow-sm text-center">
                          <div className="text-[9px] lg:text-sm text-gray-400">опер. расх.</div>
                          <div className="text-xs lg:text-base font-semibold text-orange-500 dark:text-orange-400">
                            {fmt(chartTotalOpex)} ₸
                          </div>
                          <div className="text-[8px] lg:text-xs text-orange-400">
                            {chartTotalRevenue > 0 ? ((chartTotalOpex / chartTotalRevenue) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg px-1.5 py-1.5 lg:px-4 lg:py-3 shadow-sm text-center">
                          <div className="text-[9px] lg:text-sm text-gray-400">цена клиента</div>
                          <div className="text-xs lg:text-base font-semibold text-sky-500 dark:text-sky-400">
                            {chartTotalOrders > 0 ? fmt(chartTotalAds / chartTotalOrders) : 0} ₸
                          </div>
                          <div className="text-[8px] lg:text-xs text-sky-400">
                            {chartTotalOrders} зак.
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg px-1.5 py-1.5 lg:px-4 lg:py-3 shadow-sm text-center">
                          <div className="text-[9px] lg:text-sm text-gray-400">прибыль</div>
                          <div className="text-xs lg:text-base font-semibold text-emerald-500 dark:text-emerald-400">
                            {fmt(chartTotalProfit)} ₸
                          </div>
                          <div className="text-[8px] lg:text-xs text-emerald-400">
                            {chartTotalRevenue > 0 ? ((chartTotalProfit / chartTotalRevenue) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Рентабельность по товарам */}
            <div className="mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl overflow-hidden">
                {/* Заголовок - кликабельный для сворачивания */}
                <div
                  onClick={() => toggleSection('adProducts')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Маржинальность по товарам</h3>
                      <p className="text-[10px] lg:text-xs text-gray-400">{startDate && endDate ? `${startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <div
                      className="flex flex-col items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[9px] lg:text-xs text-gray-400">{showAdsOnlyROI ? 'реклама' : 'все продажи'}</span>
                      <button
                        onClick={() => setShowAdsOnlyROI(!showAdsOnlyROI)}
                        className={`relative w-8 h-4 lg:w-10 lg:h-5 rounded-full transition-colors cursor-pointer ${
                          showAdsOnlyROI ? 'bg-indigo-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 lg:w-4 lg:h-4 bg-white rounded-full shadow-sm transition-transform ${
                          showAdsOnlyROI ? 'translate-x-4 lg:translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                    <ChevronUp className={`w-5 h-5 text-gray-400 transition-transform ${collapsedSections.adProducts ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Содержимое - сворачиваемое */}
                <AnimatePresence>
                  {!collapsedSections.adProducts && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 bg-white/50 dark:bg-gray-800/50">
                {(() => {
                  // Расчёт данных для каждого товара
                  const totalAdSales = data.topProducts.reduce((sum: number, p: any) => sum + (p.adSales || 0), 0);

                  // Выручка по группам (для распределения групповых расходов)
                  const grpRevenue: Record<string, number> = {};
                  for (const p of data.topProducts) {
                    const g = productGroups[p.sku] || p.group;
                    if (g) grpRevenue[g] = (grpRevenue[g] || 0) + (p.revenue || 0);
                  }

                  // Рассчитать опер. расходы с учётом пересечения дат расхода и периода просмотра
                  const calcProductOpex = (sku: string, revenueShare: number, productRevenue: number) => {
                    if (!startDate || !endDate) return 0;
                    const viewStart = startDate.getTime();
                    const viewEnd = endDate.getTime();
                    const pGroup = productGroups[sku] || data.topProducts.find((p: any) => p.sku === sku)?.group;
                    let direct = 0;
                    let shared = 0;
                    let groupShared = 0;
                    for (const exp of operationalExpenses) {
                      const expStart = exp.startDate.getTime();
                      const expEnd = exp.endDate.getTime();
                      const overlapStart = Math.max(expStart, viewStart);
                      const overlapEnd = Math.min(expEnd, viewEnd);
                      if (overlapStart > overlapEnd) continue;
                      const overlapDays = Math.round((overlapEnd - overlapStart) / 86400000) + 1;
                      const totalExpDays = Math.max(1, Math.round((expEnd - expStart) / 86400000) + 1);
                      const proratedAmount = (exp.amount / totalExpDays) * overlapDays;
                      if (exp.productId === sku) {
                        direct += proratedAmount;
                      } else if (exp.productGroup && pGroup === exp.productGroup && grpRevenue[exp.productGroup]) {
                        groupShared += proratedAmount * (productRevenue / grpRevenue[exp.productGroup]);
                      } else if (!exp.productId && !exp.productGroup) {
                        shared += proratedAmount * revenueShare;
                      }
                    }
                    return direct + groupShared + shared;
                  };

                  const totalProductRevenue = data.topProducts.reduce((s: number, p: any) => s + (p.revenue || 0), 0);

                  const productsWithData = data.topProducts.map((product: any) => {
                    const revenueShare = totalProductRevenue > 0 ? (product.revenue || 0) / totalProductRevenue : 0;
                    const opexForPeriod = calcProductOpex(product.sku, revenueShare, product.revenue || 0);
                    return {
                      ...product,
                      displaySales: product.sales,
                      totalSales: product.sales,
                      displayCost: product.costPrice || product.cost || 0,
                      displayRevenue: product.revenue,
                      displayAdExpense: product.adCost || 0,
                      displayCommission: product.commission || 0,
                      displayTax: product.tax || 0,
                      displayDelivery: product.delivery || 0,
                      displayOperational: opexForPeriod,
                      displayProfit: product.profit ?? (product.revenue - (product.cost || 0)),
                      displayMargin: Math.round(product.margin ?? (product.revenue > 0 ? ((product.revenue - (product.cost || 0)) / product.revenue) * 100 : 0)),
                      isAdsMode: showAdsOnlyROI
                    };
                  })
                  // Фильтр по поиску
                  .filter((product: any) =>
                    !productSearch || product.name.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  // Сортировка
                  .sort((a: any, b: any) => {
                    if (productSort === 'margin') return b.displayMargin - a.displayMargin;
                    if (productSort === 'profit') return b.displayProfit - a.displayProfit;
                    if (productSort === 'quantity') return (b.displaySales || 0) - (a.displaySales || 0);
                    return b.displayRevenue - a.displayRevenue;
                  });

                  // Пагинация
                  const totalPages = Math.ceil(productsWithData.length / PRODUCTS_PER_PAGE);
                  const startIdx = (productPage - 1) * PRODUCTS_PER_PAGE;
                  const displayedProducts = productsWithData.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

                  return (
                    <>
                      {/* Поиск и сортировка */}
                      <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-4">
                        <input
                          type="text"
                          placeholder="Поиск..."
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setProductPage(1); // Сброс на первую страницу при поиске
                          }}
                          className="flex-1 max-w-[120px] lg:max-w-[200px] h-5 lg:h-8 px-1.5 lg:px-3 text-[9px] lg:text-sm border border-gray-200 dark:border-gray-600 rounded lg:rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:border-indigo-400"
                        />
                        <span className="text-[9px] lg:text-sm text-gray-400">сорт:</span>
                        {[
                          { key: 'margin', label: 'маржа' },
                          { key: 'profit', label: 'прибыль' },
                          { key: 'revenue', label: 'выручка' },
                          { key: 'quantity', label: 'кол-во' }
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => {
                              setProductSort(opt.key as 'margin' | 'profit' | 'revenue' | 'quantity');
                              setProductPage(1); // Сброс на первую страницу при смене сортировки
                            }}
                            className={`px-2 py-0.5 lg:px-3 lg:py-1 rounded lg:rounded-lg text-[9px] lg:text-sm transition-colors ${
                              productSort === opt.key
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {/* Итоги по группам */}
                      {(() => {
                        const groupSlugs = [...new Set(productsWithData.map((p: any) => productGroups[p.sku] || p.group).filter(Boolean))] as string[];
                        if (groupSlugs.length === 0) return null;
                        const calcGroup = (items: any[]) => ({
                          count: items.length,
                          revenue: items.reduce((s: number, p: any) => s + (p.displayRevenue || 0), 0),
                          profit: items.reduce((s: number, p: any) => s + (p.displayProfit || 0), 0),
                          margin: items.reduce((s: number, p: any) => s + (p.displayRevenue || 0), 0) > 0
                            ? (items.reduce((s: number, p: any) => s + (p.displayProfit || 0), 0) / items.reduce((s: number, p: any) => s + (p.displayRevenue || 0), 0)) * 100
                            : 0,
                        });
                        return (
                          <div className={`grid gap-2 lg:gap-3 mb-2 lg:mb-4 ${groupSlugs.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
                            {groupSlugs.map(slug => {
                              const items = productsWithData.filter((p: any) => (productGroups[p.sku] || p.group) === slug);
                              if (items.length === 0) return null;
                              const meta = groupsMeta.find(g => g.slug === slug);
                              const color = meta?.color || '#6b7280';
                              const stats = calcGroup(items);
                              return (
                                <div key={slug} className="rounded-lg p-2 lg:p-3" style={{ backgroundColor: color + '15' }}>
                                  <div className="text-[10px] lg:text-xs font-medium mb-1" style={{ color }}>{meta?.name || slug} · {stats.count} товаров</div>
                                  <div className="text-[10px] lg:text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                    <div>Выр: {fmt(stats.revenue)} ₸</div>
                                    <div className={stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>Приб: {stats.profit >= 0 ? '+' : ''}{fmt(stats.profit)} ₸</div>
                                    <div>Маржа: {Math.round(stats.margin)}%</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      {/* Карточки товаров */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 lg:gap-3">
                        {displayedProducts.map((product: any) => (
                          <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg px-2.5 py-1.5 lg:px-4 lg:py-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {(productGroups[product.sku] || product.group) && (() => {
                                  const slug = productGroups[product.sku] || product.group;
                                  const meta = groupsMeta.find(g => g.slug === slug);
                                  const color = meta?.color || '#6b7280';
                                  const label = meta?.name || slug;
                                  return (
                                    <span className="text-[8px] lg:text-[10px] px-1 lg:px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                                      style={{ color, backgroundColor: color + '20' }}>
                                      {label && label.length > 6 ? label.slice(0, 5) + '.' : label}
                                    </span>
                                  );
                                })()}
                                <p className="font-medium text-sm lg:text-base text-gray-900 dark:text-white truncate">{product.name}</p>
                              </div>
                              <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{product.displaySales} шт</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5 lg:mt-1">
                              <div className="flex items-center gap-2 lg:gap-3">
                                <span className={`font-semibold ${
                                  product.displayMargin >= 40 ? 'text-emerald-600 dark:text-emerald-400' :
                                  product.displayMargin >= 20 ? 'text-amber-600 dark:text-amber-400' :
                                  product.displayMargin >= 0 ? 'text-orange-500 dark:text-orange-400' :
                                  'text-red-500 dark:text-red-400'
                                }`}>
                                  <span className="text-[9px] lg:text-xs opacity-50 font-normal text-gray-500 dark:text-gray-400">маржа</span> {product.displayMargin}%
                                </span>
                                {product.displayAdExpense > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400"><span className="text-[9px] lg:text-xs opacity-50">рекл</span> {fmt(product.displayAdExpense)} ₸</span>
                                )}
                                {product.displayOperational > 0 && (
                                  <span className="text-orange-500 dark:text-orange-400"><span className="text-[9px] lg:text-xs opacity-50">опер</span> {fmt(product.displayOperational)} ₸</span>
                                )}
                                {product.displayAdExpense > 0 && product.displaySales > 0 && (
                                  <span><span className="text-[9px] lg:text-xs opacity-50">цена клиента</span> {fmt(product.displayAdExpense / product.displaySales)} ₸</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 lg:gap-3">
                                <span><span className="text-[9px] lg:text-xs opacity-50">выр</span> {fmt(product.displayRevenue)} ₸</span>
                                <span className={product.displayProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 font-medium'}>
                                  <span className="text-[9px] lg:text-xs opacity-50 font-normal">приб</span> {product.displayProfit >= 0 ? '+' : ''}{fmt(product.displayProfit)} ₸
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Пагинация */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 lg:gap-2 mt-2 lg:mt-4">
                          <button
                            onClick={() => setProductPage(p => Math.max(1, p - 1))}
                            disabled={productPage === 1}
                            className="px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ←
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Показываем страницы вокруг текущей
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (productPage <= 3) {
                              pageNum = i + 1;
                            } else if (productPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = productPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setProductPage(pageNum)}
                                className={`w-6 h-6 lg:w-8 lg:h-8 text-[10px] lg:text-sm rounded transition-colors ${
                                  productPage === pageNum
                                    ? 'bg-indigo-500 text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setProductPage(p => Math.min(totalPages, p + 1))}
                            disabled={productPage === totalPages}
                            className="px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            →
                          </button>
                          <span className="text-[9px] lg:text-sm text-gray-400 ml-2">
                            {productsWithData.length} товаров
                          </span>
                        </div>
                      )}
                      {productsWithData.length === 0 && (
                        <div className="text-center text-[10px] lg:text-sm text-gray-400 py-2">Ничего не найдено</div>
                      )}
                    </>
                  );
                })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Pie Charts - Side by Side */}
            <div className="mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 rounded-2xl overflow-hidden">
                {/* Заголовок - кликабельный для сворачивания */}
                <div
                  onClick={() => toggleSection('sources')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Источники и способы доставки</h3>
                      <p className="text-[10px] lg:text-xs text-gray-400">{startDate && endDate ? `${startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}</p>
                    </div>
                  </div>
                  <ChevronUp className={`w-5 h-5 text-gray-400 transition-transform ${collapsedSections.sources ? 'rotate-180' : ''}`} />
                </div>

                {/* Содержимое - сворачиваемое */}
                <AnimatePresence>
                  {!collapsedSections.sources && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 sm:p-5 lg:p-6 bg-white/50 dark:bg-gray-800/50">
                      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
                        {/* Sales Sources Distribution */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 sm:p-3 lg:p-5 shadow-sm">
                          <h4 className="text-[11px] sm:text-sm lg:text-base font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 lg:mb-3">Источники продаж</h4>
                          <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 300 : window.innerWidth >= 640 ? 140 : 110}>
                            <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                              <Pie
                                data={salesSourcesData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius="90%"
                                innerRadius="25%"
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {salesSourcesData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={SALES_SOURCE_COLORS[index % SALES_SOURCE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                  fontSize: '10px',
                                  padding: '4px 8px',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>

                          {/* Детализация */}
                          <div className="mt-1 sm:mt-2 lg:mt-3 space-y-0.5 lg:space-y-1">
                            {salesSourcesData.map((item, index) => {
                              const total = salesSourcesData.reduce((sum: number, i) => sum + i.value, 0);
                              const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                              return (
                                <div
                                  key={item.name}
                                  className="flex items-center gap-1 sm:gap-2 lg:gap-3 px-1 lg:px-2 py-0.5 lg:py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <div
                                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: SALES_SOURCE_COLORS[index] }}
                                  />
                                  <div className="flex-1 flex justify-between items-center min-w-0">
                                    <span className="text-[10px] sm:text-xs lg:text-sm text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                                    <span className="text-[9px] sm:text-[11px] lg:text-sm font-medium text-gray-900 dark:text-white ml-1">{item.value} <span className="text-gray-400">({percent}%)</span></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Delivery Mode */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 sm:p-3 lg:p-5 shadow-sm">
                          <h4 className="text-[11px] sm:text-sm lg:text-base font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 lg:mb-3">Способы доставки</h4>
                          <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 300 : window.innerWidth >= 640 ? 140 : 110}>
                            <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                              <Pie
                                data={deliveryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius="90%"
                                innerRadius="25%"
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {deliveryData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={DELIVERY_COLORS[index % DELIVERY_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                  fontSize: '10px',
                                  padding: '4px 8px',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>

                          {/* Детализация */}
                          <div className="mt-1 sm:mt-2 lg:mt-3 space-y-0.5 lg:space-y-1">
                            {deliveryData.map((item, index) => {
                              const total = deliveryData.reduce((sum: number, i) => sum + i.value, 0);
                              const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                              return (
                                <div key={item.name}>
                                  <button
                                    onClick={() => item.value > 0 && setDeliveryPopup({ name: item.name, key: item.key, color: DELIVERY_COLORS[index] })}
                                    className={`w-full flex items-center gap-1 sm:gap-2 lg:gap-3 px-1 lg:px-2 py-0.5 lg:py-1 rounded transition-colors ${item.value > 0 ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' : 'opacity-50'}`}
                                  >
                                    <div
                                      className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: DELIVERY_COLORS[index] }}
                                    />
                                    <div className="flex-1 flex justify-between items-center min-w-0">
                                      <span className="text-[10px] sm:text-xs lg:text-sm text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] sm:text-[11px] lg:text-sm font-medium text-gray-900 dark:text-white">{item.value} <span className="text-gray-400">({percent}%)</span></span>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Отзывы</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Скоро — подключение отзывов с Kaspi. Мы работаем над интеграцией с системой отзывов Kaspi.kz
              </p>
            </div>
          </div>
        )}

        {/* Popup детализации по дню */}
        <AnimatePresence>
          {showDayPopup && selectedDayData && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDayPopup(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />

              {/* Popup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedDayData.date}</h2>
                      <p className="text-emerald-100 text-sm mt-1">{selectedDayData.day}</p>
                    </div>
                    <button
                      onClick={() => setShowDayPopup(false)}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  {/* Основные метрики */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-sm text-gray-600 mb-1">Заказов</div>
                      <div className="text-2xl font-bold text-gray-900">{selectedDayData.orders}</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="text-sm text-blue-600 mb-1">Выручка</div>
                      <div className="text-2xl font-bold text-blue-600">{selectedDayData.revenue.toLocaleString('ru-RU')} ₸</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4">
                      <div className="text-sm text-red-600 mb-1">Расходы</div>
                      <div className="text-2xl font-bold text-red-600">
                        {(selectedDayData.cost + selectedDayData.advertising + selectedDayData.tax + selectedDayData.commissions + selectedDayData.delivery).toLocaleString('ru-RU')} ₸
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <div className="text-sm text-emerald-600 mb-1">Прибыль</div>
                      <div className="text-2xl font-bold text-emerald-600">{selectedDayData.profit.toLocaleString('ru-RU')} ₸</div>
                    </div>
                  </div>

                  {/* Детализация расходов - выпадающий список */}
                  <div className="mb-6">
                    <button
                      onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                      className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">Детализация расходов</h3>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          showExpenseDetails ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {showExpenseDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 mt-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Себестоимость</span>
                              <span className="font-semibold text-gray-900">{selectedDayData.cost.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Реклама</span>
                              <span className="font-semibold text-gray-900">{selectedDayData.advertising.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Налог</span>
                              <span className="font-semibold text-gray-900">{selectedDayData.tax.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Комиссия</span>
                              <span className="font-semibold text-gray-900">{selectedDayData.commissions.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">Доставка</span>
                              <span className="font-semibold text-gray-900">{selectedDayData.delivery.toLocaleString('ru-RU')} ₸</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Проданные товары */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Проданные товары</h3>
                    <div className="space-y-3">
                      {data.topProducts.slice(0, 3).map((product: any) => (
                        <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl">{product.image}</div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.sku}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-emerald-600">
                              {Math.floor(product.sales / data.dailyData.length)} шт
                            </div>
                            <div className="text-sm text-gray-500">
                              {Math.floor(product.revenue / data.dailyData.length).toLocaleString('ru-RU')} ₸
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      Показаны примерные данные на основе общей статистики
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button
                    onClick={() => setShowDayPopup(false)}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>


        {/* Returns Modal */}
        <AnimatePresence>
          {showReturnsModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReturnsModal(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[80vh] flex flex-col"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Возвраты</h2>
                      <p className="text-white/80 text-sm mt-1">
                        {(() => {
                          const ret = creationTotals.totalReturned;
                          const total = creationTotals.totalOrders + ret;
                          const pct = total > 0 ? ((ret / total) * 100).toFixed(1) : '0';
                          return `${ret} из ${total} заказов (${pct}%)`;
                        })()}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowReturnsModal(false)}
                      className="text-white/80 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                  {(() => {
                    const allReturns = sourceData.returnedOrders || [];
                    const filteredReturns = startDate && endDate
                      ? allReturns.filter((o: any) => {
                          if (!o.date) return false;
                          return o.date >= toLocalDate(startDate) && o.date <= toLocalDate(endDate);
                        })
                      : allReturns;

                    if (filteredReturns.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-400">
                          <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Возвратов не найдено</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="space-y-3">
                          {filteredReturns.map((order: any, index: number) => (
                            <div key={order.id || index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                              <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{order.product}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  <span>{order.customer}</span>
                                  {order.date && <span className="text-gray-300">•</span>}
                                  {order.date && <span>{new Date(order.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-semibold text-red-600">{fmt(order.amount)} ₸</div>
                                <div className="text-xs text-gray-400">{order.itemsCount} шт</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Сумма возвратов:</span>
                            <span className="text-lg font-bold text-red-600">
                              {fmt(filteredReturns.reduce((sum: number, o: any) => sum + (o.amount || 0), 0))} ₸
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button
                    onClick={() => setShowReturnsModal(false)}
                    className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Table Day Detail Popup */}
        <AnimatePresence>
          {showTableDayPopup && selectedTableDay && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTableDayPopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-sky-500 to-sky-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedTableDay.date} ({selectedTableDay.day})</h2>
                      <p className="text-white/80 text-sm mt-1">Детализация за день</p>
                    </div>
                    <button
                      onClick={() => setShowTableDayPopup(false)}
                      className="text-white/80 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-sky-50 rounded-xl p-2 text-center">
                      <div className="text-sky-600 font-bold text-sm">{selectedTableDay.revenue.toLocaleString('ru-RU')} ₸</div>
                      <div className="text-gray-500 text-[10px]">Поступления</div>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-2 text-center">
                      <div className="text-rose-500 font-bold text-sm">{(selectedTableDay.totalExpenses || 0).toLocaleString('ru-RU')} ₸</div>
                      <div className="text-gray-500 text-[10px]">Расходы</div>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-2 text-center">
                      <div className="text-teal-600 font-bold text-sm">{selectedTableDay.profit.toLocaleString('ru-RU')} ₸</div>
                      <div className="text-gray-500 text-[10px]">Прибыль</div>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-2 text-center">
                      <div className="text-violet-600 font-bold text-sm">{selectedTableDay.orders} шт</div>
                      <div className="text-gray-500 text-[10px]">Выдано</div>
                    </div>
                  </div>

                  {/* Expense Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Детализация расходов</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Себестоимость</span>
                        <span className="font-medium text-gray-900">{selectedTableDay.cost.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Реклама</span>
                        <span className="font-medium text-gray-900">{selectedTableDay.advertising.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Комиссия</span>
                        <span className="font-medium text-gray-900">{selectedTableDay.commissions.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Налог</span>
                        <span className="font-medium text-gray-900">{selectedTableDay.tax.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Доставка</span>
                        <span className="font-medium text-gray-900">{selectedTableDay.delivery.toLocaleString('ru-RU')} ₸</span>
                      </div>
                    </div>
                  </div>

                  {/* Products List */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Проданные товары</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium text-gray-600">Товар</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-600 w-12">Кол</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-600 w-24">Цена</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(selectedTableDay.products || []).map((product: DayProduct, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-1.5 px-3 text-gray-900 truncate max-w-[200px]">{product.name}</td>
                              <td className="py-1.5 px-2 text-center text-gray-600">{product.qty}</td>
                              <td className="py-1.5 px-3 text-right text-gray-900">{(product.price ?? 0).toLocaleString('ru-RU')} ₸</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button
                    onClick={() => setShowTableDayPopup(false)}
                    className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Total Summary Popup */}
        <AnimatePresence>
          {showTotalPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTotalPopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Итого за период</h2>
                      <p className="text-white/80 text-sm mt-1">{data.dailyData.length} дней</p>
                    </div>
                    <button
                      onClick={() => setShowTotalPopup(false)}
                      className="text-white/80 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-sky-50 rounded-xl p-4 text-center">
                      <div className="text-sky-600 font-bold text-xl">{data.totalRevenue.toLocaleString('ru-RU')} ₸</div>
                      <div className="text-gray-500 text-sm">Общие поступления</div>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-4 text-center">
                      <div className="text-teal-600 font-bold text-xl">{data.totalProfit.toLocaleString('ru-RU')} ₸</div>
                      <div className="text-gray-500 text-sm">Чистая прибыль</div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Ключевые показатели</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Всего заказов</span>
                        <span className="font-bold text-gray-900">{data.totalOrders}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Средний чек</span>
                        <span className="font-bold text-gray-900">{Math.round(data.avgOrderValue).toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Рентабельность</span>
                        <span className="font-bold text-emerald-600">{((data.totalProfit / data.totalRevenue) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Среднедневная выручка</span>
                        <span className="font-bold text-gray-900">{Math.round(data.totalRevenue / data.dailyData.length).toLocaleString('ru-RU')} ₸</span>
                      </div>
                    </div>
                  </div>

                  {/* Expense Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Структура расходов</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Себестоимость</span>
                        <span className="font-medium text-gray-900">{data.totalCost.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Реклама</span>
                        <span className="font-medium text-gray-900">{data.totalAdvertising.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Комиссия</span>
                        <span className="font-medium text-gray-900">{data.totalCommissions.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Налог</span>
                        <span className="font-medium text-gray-900">{data.totalTax.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Доставка</span>
                        <span className="font-medium text-gray-900">{data.totalDelivery.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      {(data.totalOperational || 0) > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Опер. расходы</span>
                        <span className="font-medium text-gray-900">{(data.totalOperational || 0).toLocaleString('ru-RU')} ₸</span>
                      </div>
                      )}
                      <div className="flex justify-between items-center py-2 bg-rose-50 -mx-2 px-2 rounded-lg">
                        <span className="font-semibold text-gray-900">Итого расходов</span>
                        <span className="font-bold text-rose-500">
                          {(data.totalCost + data.totalAdvertising + data.totalCommissions + data.totalTax + data.totalDelivery + (data.totalOperational || 0)).toLocaleString('ru-RU')} ₸
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Топ товаров</h3>
                    <div className="space-y-2">
                      {data.topProducts.slice(0, 3).map((product: any, i: number) => (
                        <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-400 w-6">{i + 1}</div>
                          <div className="text-2xl">{product.image}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.sales} шт</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{product.revenue.toLocaleString('ru-RU')} ₸</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button
                    onClick={() => setShowTotalPopup(false)}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Organic Sales Popup */}
        <AnimatePresence>
          {showOrganicPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOrganicPopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Органика</h2>
                      <p className="text-white/80 text-sm mt-1">Заказы из органического поиска</p>
                    </div>
                    <button onClick={() => setShowOrganicPopup(false)} className="text-white/80 hover:text-white text-2xl">×</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <div className="text-blue-600 font-bold text-xl">{data.salesSources.organic}</div>
                      <div className="text-gray-500 text-sm">Заказов</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <div className="text-blue-600 font-bold text-xl">{fmt(data.totalRevenue * 0.6)} ₸</div>
                      <div className="text-gray-500 text-sm">Выручка</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Заказы</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Array.from({ length: Math.min(data.salesSources.organic, 8) }).map((_, i) => {
                        const product = data.topProducts[i % data.topProducts.length];
                        const orderAmount = Math.round((data.totalRevenue * 0.6) / data.salesSources.organic * (0.8 + (i * 0.05)));
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-medium text-gray-900">Заказ #{100000 + i * 7}</div>
                              <div className="text-sm text-gray-600 truncate">{product.name}</div>
                            </div>
                            <div className="font-semibold text-gray-900">{orderAmount.toLocaleString('ru-RU')} ₸</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button onClick={() => setShowOrganicPopup(false)} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium">Закрыть</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Ads Sales Popup */}
        <AnimatePresence>
          {showAdsPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAdsPopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Реклама</h2>
                      <p className="text-white/80 text-sm mt-1">Заказы из рекламных кампаний</p>
                    </div>
                    <button onClick={() => setShowAdsPopup(false)} className="text-white/80 hover:text-white text-2xl">×</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 rounded-xl p-4 text-center">
                      <div className="text-orange-600 font-bold text-xl">{data.salesSources.advertising}</div>
                      <div className="text-gray-500 text-sm">Заказов</div>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4 text-center">
                      <div className="text-orange-600 font-bold text-xl">{fmt(data.totalRevenue * 0.4)} ₸</div>
                      <div className="text-gray-500 text-sm">Выручка</div>
                    </div>
                  </div>
                  {/* Ad Expenses & ROI */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Расходы на рекламу</span>
                      <span className="font-semibold text-red-500">-{data.totalAdvertising.toLocaleString('ru-RU')} ₸</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Прибыль от рекламы</span>
                      <span className="font-semibold text-emerald-600">{Math.round(data.totalRevenue * 0.4 - data.totalAdvertising).toLocaleString('ru-RU')} ₸</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Доля рекламы от выручки</span>
                      <span className="font-bold text-orange-600">{((data.totalAdvertising / (data.totalRevenue * 0.4)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  {/* Orders */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Заказы</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Array.from({ length: Math.min(data.salesSources.advertising, 6) }).map((_, i) => {
                        const product = data.topProducts[i % data.topProducts.length];
                        const orderAmount = Math.round((data.totalRevenue * 0.4) / data.salesSources.advertising * (0.8 + (i * 0.05)));
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-medium text-gray-900">Заказ #{200000 + i * 11}</div>
                              <div className="text-sm text-gray-600 truncate">{product.name}</div>
                            </div>
                            <div className="font-semibold text-gray-900">{orderAmount.toLocaleString('ru-RU')} ₸</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button onClick={() => setShowAdsPopup(false)} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium">Закрыть</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>


        {/* Delivery City Breakdown Popup */}
        <AnimatePresence>
          {deliveryPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeliveryPopup(null)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="p-5" style={{ borderBottom: `3px solid ${deliveryPopup.color}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: deliveryPopup.color }} />
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{deliveryPopup.name}</h2>
                    </div>
                    <button onClick={() => setDeliveryPopup(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Города</h3>
                  {(() => {
                    const cities = ((data as any).deliveryCities?.[deliveryPopup.key] || {}) as Record<string, number>;
                    const sorted = Object.entries(cities).sort((a, b) => b[1] - a[1]);
                    const total = sorted.reduce((s, [, c]) => s + c, 0);
                    if (sorted.length === 0) return <p className="text-gray-400 text-sm">Нет данных по городам</p>;
                    return (
                      <div className="space-y-1.5 max-h-72 overflow-y-auto">
                        {sorted.map(([city, count]) => (
                          <div key={city} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{city}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                              <span className="text-xs text-gray-400">{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 flex justify-end">
                  <button onClick={() => setDeliveryPopup(null)} className="px-5 py-2 text-white rounded-xl text-sm font-medium" style={{ backgroundColor: deliveryPopup.color }}>Закрыть</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>



        {/* Product Detail Popup */}
        <AnimatePresence>
          {showProductPopup && selectedProduct && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProductPopup(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 sm:p-6 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {selectedProduct.image}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold truncate">{selectedProduct.name}</h2>
                        <p className="text-emerald-100 text-sm font-mono">{selectedProduct.sku}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowProductPopup(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Period Info */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="text-sm text-gray-500 text-center">За выбранный период</div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Продажи */}
                  {(() => {
                    // Используем реальные данные из API (без множителей — API вернул за весь период)
                    const sp = selectedProduct as any;
                    const sales = sp.sales || 0;
                    const revenue = sp.revenue || 0;
                    const costPrice = sp.costPrice || 0;
                    const commission = sp.commission || 0;
                    const taxes = sp.tax || 0;
                    const deliveryCost = sp.delivery || 0;
                    const advertisingCost = sp.adCost || 0;
                    const netProfit = sp.profit ?? (revenue - costPrice - commission - taxes - deliveryCost - advertisingCost);
                    const margin = sp.margin ?? (revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0);
                    const commissionRate = data.storeSettings?.commissionRate || 12.5;
                    const taxRate = data.storeSettings?.taxRate || 4.0;

                    return (
                      <>
                        {/* Основные метрики */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-blue-50 rounded-xl p-3">
                            <div className="text-blue-600 text-xs mb-1">Продано</div>
                            <div className="text-xl font-bold text-blue-700">{sales} шт</div>
                          </div>
                          <div className="bg-sky-50 rounded-xl p-3">
                            <div className="text-sky-600 text-xs mb-1">Выручка</div>
                            <div className="text-xl font-bold text-sky-700">{revenue.toLocaleString('ru-RU')} ₸</div>
                          </div>
                        </div>

                        {/* Детализация расходов */}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">Расходы</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Себестоимость товара</span>
                              <span className="font-medium text-gray-900">{Math.round(costPrice).toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Налог ({taxRate}%)</span>
                              <span className="font-medium text-red-600">−{Math.round(taxes).toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Комиссия Kaspi ({commissionRate}%)</span>
                              <span className="font-medium text-red-600">−{Math.round(commission).toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Доставка</span>
                              <span className="font-medium text-red-600">−{Math.round(deliveryCost).toLocaleString('ru-RU')} ₸</span>
                            </div>
                            {advertisingCost > 0 && (
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Реклама</span>
                              <span className="font-medium text-red-600">−{Math.round(advertisingCost).toLocaleString('ru-RU')} ₸</span>
                            </div>
                            )}
                          </div>
                        </div>

                        {/* Итого */}
                        <div className={`${netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'} rounded-xl p-4`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className={`${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'} text-sm`}>Чистая прибыль</div>
                              <div className={`text-xs ${netProfit >= 0 ? 'text-emerald-600/70' : 'text-red-600/70'}`}>
                                Маржа: {margin}%
                              </div>
                            </div>
                            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {Math.round(netProfit).toLocaleString('ru-RU')} ₸
                            </div>
                          </div>
                        </div>

                      </>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button
                    onClick={() => setShowProductPopup(false)}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Pending Orders Popup (В пути до клиента) */}
        <AnimatePresence>
          {showPendingOrdersPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPendingOrdersPopup(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold">Ожидают поступления</h2>
                        <p className="text-amber-100 text-xs sm:text-sm">Заказы в пути до клиента</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPendingOrdersPopup(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 sm:p-6 bg-amber-50 border-b border-amber-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-amber-700">{data.pendingOrders?.count || 0}</div>
                      <div className="text-xs sm:text-sm text-amber-600">Заказов в пути</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-amber-700">
                        {fmt(data.pendingOrders?.totalAmount || 0)} ₸
                      </div>
                      <div className="text-xs sm:text-sm text-amber-600">Ожидаемая сумма</div>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-amber-100 rounded-lg text-xs sm:text-sm text-amber-700 text-center">
                    Деньги поступят после получения клиентом
                  </div>
                </div>

                {/* Orders List */}
                <div className="p-4 sm:p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Список заказов</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(data.pendingOrders?.orders || []).map((order: { id: string; product: string; amount: number; date: string; customer: string }) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{order.id}</span>
                            <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{order.customer}</span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">{order.product}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold text-gray-900 text-sm">{fmt(order.amount)} ₸</div>
                          <div className="text-[10px] text-gray-400">{order.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button
                    onClick={() => setShowPendingOrdersPopup(false)}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Chart Help Popup */}
        <AnimatePresence>
          {showChartHelp && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowChartHelp(false)}
                className="fixed inset-0 bg-black/30 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed left-4 right-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:w-72 bg-white rounded-xl shadow-xl z-50 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">Что учитывается:</p>
                  <button onClick={() => setShowChartHelp(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                    <span><b>Поступления</b> — выручка</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                    <span><b>Расходы</b> — закуп + комиссия + налог + доставка + реклама</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                    <span><b>Прибыль</b> — поступления − расходы</span>
                  </li>
                </ul>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Operational Expenses Popup */}
        <AnimatePresence>
          {showExpensesPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowExpensesPopup(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 sm:p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold">Операционные расходы</h2>
                        <p className="text-indigo-100 text-xs sm:text-sm">Регулярные затраты бизнеса</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowExpensesPopup(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 sm:p-6 bg-indigo-50 border-b border-indigo-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-indigo-700">
                        {fmt(calculateMonthlyOperationalExpenses())} ₸
                      </div>
                      <div className="text-xs sm:text-sm text-indigo-600">Всего расходов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-indigo-700">
                        {fmt(calculateAverageDailyExpenses())} ₸
                      </div>
                      <div className="text-xs sm:text-sm text-indigo-600">В день (средн.)</div>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-indigo-100 rounded-lg text-xs sm:text-sm text-indigo-700 text-center">
                    Расходы распределяются по дням в указанном периоде
                  </div>
                </div>

                {/* Expenses List */}
                <div className="p-4 sm:p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Текущие расходы</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                    {operationalExpenses.map(expense => {
                      const periodDays = Math.ceil((expense.endDate.getTime() - expense.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      const dailyAmount = expense.amount / periodDays;
                      return (
                        <div key={expense.id} className="p-3 bg-gray-50 rounded-xl group">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm">{expense.name}</div>
                              {expense.productId && (
                                <div className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 inline-block truncate max-w-full">
                                  {productsList.find(p => p.kaspi_id === expense.productId)?.name || expense.productId}
                                </div>
                              )}
                              {expense.productGroup && (() => {
                                const gm = groupsMeta.find(g => g.slug === expense.productGroup);
                                return gm ? (
                                  <div className="text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ color: gm.color, backgroundColor: gm.color + '15' }}>{gm.name}</div>
                                ) : (
                                  <div className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">{expense.productGroup}</div>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="font-semibold text-gray-900 text-sm">
                                {expense.amount.toLocaleString('ru-RU')} ₸
                              </div>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(expense.startDate, 'd MMM', { locale: ru })} — {format(expense.endDate, 'd MMM yyyy', { locale: ru })}
                            </div>
                            <div className="text-xs text-indigo-600">
                              {fmt(dailyAmount)} ₸/день
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {operationalExpenses.length === 0 && (
                      <div className="text-center text-gray-500 text-sm py-4">
                        Нет добавленных расходов
                      </div>
                    )}
                  </div>

                  {/* Add New Expense Form */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Добавить расход</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newExpenseName}
                        onChange={(e) => setNewExpenseName(e.target.value)}
                        placeholder="Название (например: Зарплата)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={newExpenseAmount}
                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                        placeholder="Сумма за период"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      {/* Product Selection */}
                      <div className="relative">
                        <button
                          onClick={() => { setShowProductDropdown(!showProductDropdown); setShowExpenseCalendar(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm hover:border-indigo-500 transition-colors"
                        >
                          <span className="text-gray-700 truncate">
                            {newExpenseGroupId
                              ? `Группа: ${groupsMeta.find(g => g.slug === newExpenseGroupId)?.name || newExpenseGroupId}`
                              : newExpenseProductId
                              ? productsList.find(p => p.kaspi_id === newExpenseProductId)?.name || 'Товар'
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
                              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-60 overflow-hidden flex flex-col"
                            >
                              <div className="p-2 border-b">
                                <input
                                  type="text"
                                  value={expenseProductSearch}
                                  onChange={(e) => setExpenseProductSearch(e.target.value)}
                                  placeholder="Поиск товара..."
                                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="overflow-y-auto max-h-48">
                                <button
                                  onClick={() => { setNewExpenseProductId(null); setNewExpenseGroupId(null); setShowProductDropdown(false); setExpenseProductSearch(''); }}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors ${!newExpenseProductId && !newExpenseGroupId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                                >
                                  Общий расход (без товара)
                                </button>
                                {groupsMeta.map(g => (
                                  <button
                                    key={g.slug}
                                    onClick={() => { setNewExpenseProductId(null); setNewExpenseGroupId(g.slug); setShowProductDropdown(false); setExpenseProductSearch(''); }}
                                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${newExpenseGroupId === g.slug ? 'font-medium' : ''}`}
                                    style={{ color: g.color }}
                                  >
                                    Группа: {g.name}
                                  </button>
                                ))}
                                <div className="border-t border-gray-100 my-1" />
                                {productsList
                                  .filter(p => !expenseProductSearch || p.name.toLowerCase().includes(expenseProductSearch.toLowerCase()))
                                  .map(p => (
                                    <button
                                      key={p.kaspi_id}
                                      onClick={() => { setNewExpenseProductId(p.kaspi_id); setNewExpenseGroupId(null); setShowProductDropdown(false); setExpenseProductSearch(''); }}
                                      className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors truncate ${newExpenseProductId === p.kaspi_id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                                    >
                                      {p.name}
                                    </button>
                                  ))
                                }
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Period Selection */}
                      <div className="relative">
                        <button
                          onClick={() => { setShowExpenseCalendar(!showExpenseCalendar); setShowProductDropdown(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm hover:border-indigo-500 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">
                              {format(newExpenseStartDate, 'd MMM', { locale: ru })} — {format(newExpenseEndDate, 'd MMM yyyy', { locale: ru })}
                            </span>
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showExpenseCalendar ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Quick Period Buttons */}
                        <AnimatePresence>
                          {showExpenseCalendar && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10"
                            >
                              <div className="text-xs text-gray-500 mb-2">Быстрый выбор:</div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <button
                                  onClick={() => {
                                    setNewExpenseStartDate(new Date('2026-01-01'));
                                    setNewExpenseEndDate(new Date('2026-01-31'));
                                    setShowExpenseCalendar(false);
                                  }}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Январь
                                </button>
                                <button
                                  onClick={() => {
                                    setNewExpenseStartDate(new Date('2026-02-01'));
                                    setNewExpenseEndDate(new Date('2026-02-28'));
                                    setShowExpenseCalendar(false);
                                  }}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Февраль
                                </button>
                                <button
                                  onClick={() => {
                                    setNewExpenseStartDate(new Date('2026-01-01'));
                                    setNewExpenseEndDate(new Date('2026-03-31'));
                                    setShowExpenseCalendar(false);
                                  }}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Q1 2026
                                </button>
                                <button
                                  onClick={() => {
                                    setNewExpenseStartDate(new Date('2026-01-01'));
                                    setNewExpenseEndDate(new Date('2026-12-31'));
                                    setShowExpenseCalendar(false);
                                  }}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Год 2026
                                </button>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">Или введите даты:</div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] text-gray-400 mb-1 block">От</label>
                                  <input
                                    type="date"
                                    value={format(newExpenseStartDate, 'yyyy-MM-dd')}
                                    onChange={(e) => setNewExpenseStartDate(new Date(e.target.value))}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] text-gray-400 mb-1 block">До</label>
                                  <input
                                    type="date"
                                    value={format(newExpenseEndDate, 'yyyy-MM-dd')}
                                    onChange={(e) => setNewExpenseEndDate(new Date(e.target.value))}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => setShowExpenseCalendar(false)}
                                className="w-full mt-3 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-colors"
                              >
                                Применить
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {newExpenseStartDate && newExpenseEndDate && newExpenseAmount && (
                        <div className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
                          ≈ {fmt(parseFloat(newExpenseAmount) / (Math.ceil((newExpenseEndDate.getTime() - newExpenseStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1))} ₸ в день
                        </div>
                      )}

                      <button
                        onClick={() => {
                          handleAddExpense();
                          setShowExpenseCalendar(false);
                        }}
                        disabled={!newExpenseName || !newExpenseAmount}
                        className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button
                    onClick={() => setShowExpensesPopup(false)}
                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Готово
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
