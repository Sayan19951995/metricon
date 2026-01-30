'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, DollarSign, TrendingUp, Calculator, Calendar, ChevronDown, ChevronRight, ChevronUp, Package, CheckCircle, AlertTriangle, XCircle, Truck, Star, MessageCircle, ThumbsUp, Plus, X, Trash2, HelpCircle, BarChart3 } from 'lucide-react';

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
        <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
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
}

// Насыщенные но спокойные цвета для источников продаж
const SALES_SOURCE_COLORS = ['#4a90d9', '#e07b4a', '#6b7280']; // Синий (Органика), оранжевый (Реклама), серый (Оффлайн)

// Насыщенные но спокойные цвета для способов доставки
const DELIVERY_COLORS = ['#7b68c9', '#d96b8a', '#4db8a4', '#d4a03d', '#6b7280']; // Фиолетовый, розовый, бирюзовый, горчичный, серый (Оффлайн)

// Mock данные для аналитики за 7 дней
const mockAnalyticsData = {
  totalOrders: 45,
  totalRevenue: 675000,
  totalCost: 425000,       // Себестоимость
  totalAdvertising: 38000,  // Реклама
  totalTax: 27000,          // Налог
  totalCommissions: 54000,  // Комиссия
  totalDelivery: 12000,     // Доставка
  totalProfit: 119000,      // Обновленная прибыль (675000 - 425000 - 38000 - 27000 - 54000 - 12000)
  avgOrderValue: 15000,
  ordersBySource: {
    organic: 28,    // Органика
    ads: 14,        // Реклама
    offline: 3      // Оффлайн
  },
  // Заказы ожидающие поступления (в пути до клиента)
  pendingOrders: {
    count: 5,            // Количество заказов в пути
    totalAmount: 62200,  // Сумма ожидаемых поступлений
    orders: [
      { id: 'ORD-2026-001', product: 'AirPods Pro 2', amount: 29900, date: '2026-01-17', customer: 'Астана' },
      { id: 'ORD-2026-002', product: 'Чехол для iPhone', amount: 4900, date: '2026-01-17', customer: 'Алматы' },
      { id: 'ORD-2026-003', product: 'Зарядка MagSafe', amount: 12900, date: '2026-01-18', customer: 'Караганда' },
      { id: 'ORD-2026-004', product: 'Apple Watch SE', amount: 8500, date: '2026-01-18', customer: 'Шымкент' },
      { id: 'ORD-2026-005', product: 'Кабель USB-C', amount: 6000, date: '2026-01-18', customer: 'Алматы' },
    ]
  },

  dailyData: [
    { date: '01.10', fullDate: new Date('2025-10-01'), day: 'Ср', orders: 2, revenue: 30426, cost: 19426, advertising: 1168, commissions: 2434, tax: 1217, delivery: 456, profit: 5725 },
    { date: '02.10', fullDate: new Date('2025-10-02'), day: 'Чт', orders: 3, revenue: 44020, cost: 25425, advertising: 1944, commissions: 3521, tax: 1761, delivery: 660, profit: 10709 },
    { date: '03.10', fullDate: new Date('2025-10-03'), day: 'Пт', orders: 2, revenue: 22483, cost: 12736, advertising: 747, commissions: 1799, tax: 899, delivery: 337, profit: 5965 },
    { date: '04.10', fullDate: new Date('2025-10-04'), day: 'Сб', orders: 2, revenue: 28540, cost: 17158, advertising: 926, commissions: 2283, tax: 1141, delivery: 428, profit: 6604 },
    { date: '05.10', fullDate: new Date('2025-10-05'), day: 'Вс', orders: 1, revenue: 16640, cost: 10368, advertising: 505, commissions: 1331, tax: 665, delivery: 249, profit: 3522 },
    { date: '06.10', fullDate: new Date('2025-10-06'), day: 'Пн', orders: 3, revenue: 49023, cost: 29377, advertising: 1526, commissions: 3922, tax: 1961, delivery: 735, profit: 11502 },
    { date: '07.10', fullDate: new Date('2025-10-07'), day: 'Вт', orders: 3, revenue: 38555, cost: 24031, advertising: 1491, commissions: 3084, tax: 1542, delivery: 578, profit: 7829 },
    { date: '08.10', fullDate: new Date('2025-10-08'), day: 'Ср', orders: 2, revenue: 21855, cost: 13744, advertising: 863, commissions: 1748, tax: 874, delivery: 328, profit: 4298 },
    { date: '09.10', fullDate: new Date('2025-10-09'), day: 'Чт', orders: 3, revenue: 50832, cost: 31325, advertising: 2776, commissions: 4066, tax: 2033, delivery: 762, profit: 9870 },
    { date: '10.10', fullDate: new Date('2025-10-10'), day: 'Пт', orders: 2, revenue: 25595, cost: 15490, advertising: 1135, commissions: 2047, tax: 1024, delivery: 384, profit: 5515 },
    { date: '11.10', fullDate: new Date('2025-10-11'), day: 'Сб', orders: 1, revenue: 15325, cost: 9396, advertising: 750, commissions: 1226, tax: 613, delivery: 230, profit: 3110 },
    { date: '12.10', fullDate: new Date('2025-10-12'), day: 'Вс', orders: 2, revenue: 22587, cost: 14584, advertising: 1039, commissions: 1807, tax: 903, delivery: 339, profit: 3915 },
    { date: '13.10', fullDate: new Date('2025-10-13'), day: 'Пн', orders: 2, revenue: 22103, cost: 13713, advertising: 1246, commissions: 1768, tax: 884, delivery: 331, profit: 4161 },
    { date: '14.10', fullDate: new Date('2025-10-14'), day: 'Вт', orders: 2, revenue: 23523, cost: 12940, advertising: 787, commissions: 1882, tax: 941, delivery: 353, profit: 6620 },
    { date: '15.10', fullDate: new Date('2025-10-15'), day: 'Ср', orders: 2, revenue: 37700, cost: 22575, advertising: 1297, commissions: 3016, tax: 1508, delivery: 565, profit: 8739 },
    { date: '16.10', fullDate: new Date('2025-10-16'), day: 'Чт', orders: 2, revenue: 34417, cost: 20473, advertising: 1615, commissions: 2753, tax: 1377, delivery: 516, profit: 7683 },
    { date: '17.10', fullDate: new Date('2025-10-17'), day: 'Пт', orders: 2, revenue: 26128, cost: 15032, advertising: 1457, commissions: 2090, tax: 1045, delivery: 392, profit: 6112 },
    { date: '18.10', fullDate: new Date('2025-10-18'), day: 'Сб', orders: 1, revenue: 21032, cost: 11722, advertising: 912, commissions: 1682, tax: 841, delivery: 315, profit: 5560 },
    { date: '19.10', fullDate: new Date('2025-10-19'), day: 'Вс', orders: 1, revenue: 21531, cost: 12772, advertising: 1171, commissions: 1722, tax: 861, delivery: 323, profit: 4682 },
    { date: '20.10', fullDate: new Date('2025-10-20'), day: 'Пн', orders: 2, revenue: 24936, cost: 15384, advertising: 1342, commissions: 1995, tax: 997, delivery: 374, profit: 4844 },
    { date: '21.10', fullDate: new Date('2025-10-21'), day: 'Вт', orders: 2, revenue: 25285, cost: 15915, advertising: 1153, commissions: 2023, tax: 1011, delivery: 379, profit: 4804 },
    { date: '22.10', fullDate: new Date('2025-10-22'), day: 'Ср', orders: 2, revenue: 28038, cost: 17954, advertising: 1373, commissions: 2243, tax: 1121, delivery: 420, profit: 4927 },
    { date: '23.10', fullDate: new Date('2025-10-23'), day: 'Чт', orders: 2, revenue: 21975, cost: 13078, advertising: 1212, commissions: 1758, tax: 879, delivery: 329, profit: 4719 },
    { date: '24.10', fullDate: new Date('2025-10-24'), day: 'Пт', orders: 3, revenue: 44483, cost: 25052, advertising: 1665, commissions: 3558, tax: 1779, delivery: 667, profit: 11762 },
    { date: '25.10', fullDate: new Date('2025-10-25'), day: 'Сб', orders: 2, revenue: 31812, cost: 19149, advertising: 1054, commissions: 2545, tax: 1272, delivery: 477, profit: 7315 },
    { date: '26.10', fullDate: new Date('2025-10-26'), day: 'Вс', orders: 2, revenue: 24980, cost: 16092, advertising: 1232, commissions: 1998, tax: 999, delivery: 375, profit: 4284 },
    { date: '27.10', fullDate: new Date('2025-10-27'), day: 'Пн', orders: 3, revenue: 46437, cost: 29639, advertising: 1397, commissions: 3715, tax: 1857, delivery: 696, profit: 9133 },
    { date: '28.10', fullDate: new Date('2025-10-28'), day: 'Вт', orders: 2, revenue: 30826, cost: 18961, advertising: 1813, commissions: 2466, tax: 1233, delivery: 462, profit: 5891 },
    { date: '29.10', fullDate: new Date('2025-10-29'), day: 'Ср', orders: 2, revenue: 20133, cost: 12799, advertising: 728, commissions: 1611, tax: 805, delivery: 302, profit: 3888 },
    { date: '30.10', fullDate: new Date('2025-10-30'), day: 'Чт', orders: 3, revenue: 48630, cost: 28672, advertising: 1771, commissions: 3890, tax: 1945, delivery: 729, profit: 11623 },
    { date: '31.10', fullDate: new Date('2025-10-31'), day: 'Пт', orders: 3, revenue: 43683, cost: 24251, advertising: 2323, commissions: 3495, tax: 1747, delivery: 655, profit: 11212 },
    { date: '01.11', fullDate: new Date('2025-11-01'), day: 'Сб', orders: 1, revenue: 20139, cost: 11924, advertising: 875, commissions: 1611, tax: 805, delivery: 302, profit: 4622 },
    { date: '02.11', fullDate: new Date('2025-11-02'), day: 'Вс', orders: 2, revenue: 26830, cost: 16731, advertising: 916, commissions: 2146, tax: 1073, delivery: 402, profit: 5562 },
    { date: '03.11', fullDate: new Date('2025-11-03'), day: 'Пн', orders: 3, revenue: 50250, cost: 30981, advertising: 1946, commissions: 4020, tax: 2010, delivery: 754, profit: 10539 },
    { date: '04.11', fullDate: new Date('2025-11-04'), day: 'Вт', orders: 2, revenue: 27040, cost: 16172, advertising: 1453, commissions: 2163, tax: 1081, delivery: 405, profit: 5766 },
    { date: '05.11', fullDate: new Date('2025-11-05'), day: 'Ср', orders: 2, revenue: 30576, cost: 19008, advertising: 1076, commissions: 2446, tax: 1223, delivery: 458, profit: 6365 },
    { date: '06.11', fullDate: new Date('2025-11-06'), day: 'Чт', orders: 2, revenue: 24826, cost: 15771, advertising: 919, commissions: 1986, tax: 993, delivery: 372, profit: 4785 },
    { date: '07.11', fullDate: new Date('2025-11-07'), day: 'Пт', orders: 2, revenue: 20578, cost: 13231, advertising: 1030, commissions: 1646, tax: 823, delivery: 309, profit: 3539 },
    { date: '08.11', fullDate: new Date('2025-11-08'), day: 'Сб', orders: 2, revenue: 24564, cost: 14394, advertising: 930, commissions: 1965, tax: 982, delivery: 368, profit: 5925 },
    { date: '09.11', fullDate: new Date('2025-11-09'), day: 'Вс', orders: 1, revenue: 15245, cost: 8411, advertising: 795, commissions: 1219, tax: 610, delivery: 229, profit: 3981 },
    { date: '10.11', fullDate: new Date('2025-11-10'), day: 'Пн', orders: 2, revenue: 38936, cost: 24527, advertising: 1310, commissions: 3115, tax: 1557, delivery: 584, profit: 7843 },
    { date: '11.11', fullDate: new Date('2025-11-11'), day: 'Вт', orders: 3, revenue: 44687, cost: 27144, advertising: 2552, commissions: 3575, tax: 1787, delivery: 670, profit: 8959 },
    { date: '12.11', fullDate: new Date('2025-11-12'), day: 'Ср', orders: 2, revenue: 29288, cost: 17941, advertising: 1209, commissions: 2343, tax: 1171, delivery: 439, profit: 6185 },
    { date: '13.11', fullDate: new Date('2025-11-13'), day: 'Чт', orders: 3, revenue: 55737, cost: 32451, advertising: 2704, commissions: 4459, tax: 2229, delivery: 836, profit: 13058 },
    { date: '14.11', fullDate: new Date('2025-11-14'), day: 'Пт', orders: 3, revenue: 41603, cost: 24418, advertising: 2316, commissions: 3328, tax: 1664, delivery: 624, profit: 9253 },
    { date: '15.11', fullDate: new Date('2025-11-15'), day: 'Сб', orders: 1, revenue: 12962, cost: 7912, advertising: 541, commissions: 1037, tax: 518, delivery: 194, profit: 2760 },
    { date: '16.11', fullDate: new Date('2025-11-16'), day: 'Вс', orders: 2, revenue: 27618, cost: 17818, advertising: 1168, commissions: 2209, tax: 1105, delivery: 414, profit: 4904 },
    { date: '17.11', fullDate: new Date('2025-11-17'), day: 'Пн', orders: 3, revenue: 45534, cost: 25051, advertising: 2710, commissions: 3643, tax: 1821, delivery: 683, profit: 11626 },
    { date: '18.11', fullDate: new Date('2025-11-18'), day: 'Вт', orders: 2, revenue: 24702, cost: 15253, advertising: 1070, commissions: 1976, tax: 988, delivery: 370, profit: 5045 },
    { date: '19.11', fullDate: new Date('2025-11-19'), day: 'Ср', orders: 3, revenue: 43888, cost: 24323, advertising: 2314, commissions: 3511, tax: 1755, delivery: 658, profit: 11327 },
    { date: '20.11', fullDate: new Date('2025-11-20'), day: 'Чт', orders: 3, revenue: 38427, cost: 23111, advertising: 2268, commissions: 3074, tax: 1537, delivery: 576, profit: 7861 },
    { date: '21.11', fullDate: new Date('2025-11-21'), day: 'Пт', orders: 2, revenue: 28789, cost: 18248, advertising: 1133, commissions: 2303, tax: 1151, delivery: 432, profit: 5522 },
    { date: '22.11', fullDate: new Date('2025-11-22'), day: 'Сб', orders: 1, revenue: 13598, cost: 8112, advertising: 447, commissions: 1088, tax: 544, delivery: 204, profit: 3203 },
    { date: '23.11', fullDate: new Date('2025-11-23'), day: 'Вс', orders: 2, revenue: 33864, cost: 20357, advertising: 1392, commissions: 2709, tax: 1354, delivery: 508, profit: 7544 },
    { date: '24.11', fullDate: new Date('2025-11-24'), day: 'Пн', orders: 2, revenue: 36706, cost: 22433, advertising: 1224, commissions: 2936, tax: 1468, delivery: 550, profit: 8095 },
    { date: '25.11', fullDate: new Date('2025-11-25'), day: 'Вт', orders: 3, revenue: 55860, cost: 36060, advertising: 2961, commissions: 4469, tax: 2234, delivery: 838, profit: 9298 },
    { date: '26.11', fullDate: new Date('2025-11-26'), day: 'Ср', orders: 2, revenue: 26502, cost: 15822, advertising: 867, commissions: 2120, tax: 1060, delivery: 397, profit: 6236 },
    { date: '27.11', fullDate: new Date('2025-11-27'), day: 'Чт', orders: 3, revenue: 42633, cost: 26301, advertising: 2183, commissions: 3410, tax: 1705, delivery: 639, profit: 8395 },
    { date: '28.11', fullDate: new Date('2025-11-28'), day: 'Пт', orders: 2, revenue: 32370, cost: 19010, advertising: 1678, commissions: 2589, tax: 1295, delivery: 485, profit: 7313 },
    { date: '29.11', fullDate: new Date('2025-11-29'), day: 'Сб', orders: 2, revenue: 28168, cost: 17075, advertising: 1375, commissions: 2253, tax: 1127, delivery: 422, profit: 5916 },
    { date: '30.11', fullDate: new Date('2025-11-30'), day: 'Вс', orders: 1, revenue: 16735, cost: 9404, advertising: 597, commissions: 1339, tax: 669, delivery: 251, profit: 4475 },
    { date: '01.12', fullDate: new Date('2025-12-01'), day: 'Пн', orders: 3, revenue: 46257, cost: 29414, advertising: 1806, commissions: 3700, tax: 1850, delivery: 694, profit: 8793 },
    { date: '02.12', fullDate: new Date('2025-12-02'), day: 'Вт', orders: 3, revenue: 42660, cost: 24701, advertising: 1832, commissions: 3413, tax: 1706, delivery: 640, profit: 10368 },
    { date: '03.12', fullDate: new Date('2025-12-03'), day: 'Ср', orders: 3, revenue: 38943, cost: 22015, advertising: 1710, commissions: 3115, tax: 1558, delivery: 584, profit: 9961 },
    { date: '04.12', fullDate: new Date('2025-12-04'), day: 'Чт', orders: 2, revenue: 29070, cost: 18614, advertising: 903, commissions: 2325, tax: 1163, delivery: 436, profit: 5629 },
    { date: '05.12', fullDate: new Date('2025-12-05'), day: 'Пт', orders: 3, revenue: 37213, cost: 23447, advertising: 1245, commissions: 2977, tax: 1488, delivery: 558, profit: 7498 },
    { date: '06.12', fullDate: new Date('2025-12-06'), day: 'Сб', orders: 1, revenue: 12318, cost: 7140, advertising: 538, commissions: 985, tax: 493, delivery: 185, profit: 2977 },
    { date: '07.12', fullDate: new Date('2025-12-07'), day: 'Вс', orders: 2, revenue: 21872, cost: 13165, advertising: 777, commissions: 1750, tax: 875, delivery: 328, profit: 4977 },
    { date: '08.12', fullDate: new Date('2025-12-08'), day: 'Пн', orders: 3, revenue: 41181, cost: 23175, advertising: 2208, commissions: 3294, tax: 1647, delivery: 618, profit: 10239 },
    { date: '09.12', fullDate: new Date('2025-12-09'), day: 'Вт', orders: 3, revenue: 46356, cost: 29600, advertising: 2190, commissions: 3708, tax: 1854, delivery: 695, profit: 8309 },
    { date: '10.12', fullDate: new Date('2025-12-10'), day: 'Ср', orders: 2, revenue: 23813, cost: 14055, advertising: 801, commissions: 1905, tax: 952, delivery: 357, profit: 5743 },
    { date: '11.12', fullDate: new Date('2025-12-11'), day: 'Чт', orders: 2, revenue: 34907, cost: 19781, advertising: 2053, commissions: 2792, tax: 1396, delivery: 523, profit: 8362 },
    { date: '12.12', fullDate: new Date('2025-12-12'), day: 'Пт', orders: 3, revenue: 40690, cost: 26008, advertising: 1595, commissions: 3255, tax: 1627, delivery: 610, profit: 7595 },
    { date: '13.12', fullDate: new Date('2025-12-13'), day: 'Сб', orders: 2, revenue: 26276, cost: 16769, advertising: 1121, commissions: 2102, tax: 1051, delivery: 394, profit: 4839 },
    { date: '14.12', fullDate: new Date('2025-12-14'), day: 'Вс', orders: 2, revenue: 26408, cost: 16978, advertising: 958, commissions: 2113, tax: 1056, delivery: 396, profit: 4907 },
    { date: '15.12', fullDate: new Date('2025-12-15'), day: 'Пн', orders: 3, revenue: 35909, cost: 20170, advertising: 1177, commissions: 2873, tax: 1436, delivery: 538, profit: 9715 },
    { date: '16.12', fullDate: new Date('2025-12-16'), day: 'Вт', orders: 2, revenue: 39055, cost: 23378, advertising: 2120, commissions: 3124, tax: 1562, delivery: 586, profit: 8285 },
    { date: '17.12', fullDate: new Date('2025-12-17'), day: 'Ср', orders: 3, revenue: 46030, cost: 29860, advertising: 2682, commissions: 3682, tax: 1841, delivery: 690, profit: 7275 },
    { date: '18.12', fullDate: new Date('2025-12-18'), day: 'Чт', orders: 3, revenue: 49133, cost: 30139, advertising: 2409, commissions: 3931, tax: 1965, delivery: 737, profit: 9952 },
    { date: '19.12', fullDate: new Date('2025-12-19'), day: 'Пт', orders: 3, revenue: 44538, cost: 25352, advertising: 1998, commissions: 3563, tax: 1781, delivery: 668, profit: 11176 },
    { date: '20.12', fullDate: new Date('2025-12-20'), day: 'Сб', orders: 2, revenue: 27418, cost: 16468, advertising: 1119, commissions: 2193, tax: 1097, delivery: 411, profit: 6130 },
    { date: '21.12', fullDate: new Date('2025-12-21'), day: 'Вс', orders: 2, revenue: 30488, cost: 17973, advertising: 1055, commissions: 2439, tax: 1219, delivery: 457, profit: 7345 },
    { date: '22.12', fullDate: new Date('2025-12-22'), day: 'Пн', orders: 3, revenue: 43411, cost: 24923, advertising: 1746, commissions: 3473, tax: 1736, delivery: 651, profit: 10882 },
    { date: '23.12', fullDate: new Date('2025-12-23'), day: 'Вт', orders: 2, revenue: 26044, cost: 15071, advertising: 859, commissions: 2083, tax: 1042, delivery: 390, profit: 6599 },
    { date: '24.12', fullDate: new Date('2025-12-24'), day: 'Ср', orders: 3, revenue: 55367, cost: 34774, advertising: 3117, commissions: 4429, tax: 2215, delivery: 830, profit: 10002 },
    { date: '25.12', fullDate: new Date('2025-12-25'), day: 'Чт', orders: 3, revenue: 32773, cost: 21103, advertising: 1392, commissions: 2622, tax: 1311, delivery: 491, profit: 5854 },
    { date: '26.12', fullDate: new Date('2025-12-26'), day: 'Пт', orders: 3, revenue: 46460, cost: 28656, advertising: 1667, commissions: 3717, tax: 1858, delivery: 697, profit: 9865 },
    { date: '27.12', fullDate: new Date('2025-12-27'), day: 'Сб', orders: 1, revenue: 13962, cost: 7696, advertising: 649, commissions: 1117, tax: 558, delivery: 209, profit: 3733 },
    { date: '28.12', fullDate: new Date('2025-12-28'), day: 'Вс', orders: 1, revenue: 21113, cost: 11701, advertising: 1125, commissions: 1689, tax: 844, delivery: 317, profit: 5437 },
    { date: '29.12', fullDate: new Date('2025-12-29'), day: 'Пн', orders: 3, revenue: 42600, cost: 27291, advertising: 1422, commissions: 3408, tax: 1704, delivery: 639, profit: 8136 },
    { date: '30.12', fullDate: new Date('2025-12-30'), day: 'Вт', orders: 2, revenue: 31313, cost: 19176, advertising: 1281, commissions: 2505, tax: 1252, delivery: 470, profit: 6629 },
    { date: '31.12', fullDate: new Date('2025-12-31'), day: 'Ср', orders: 2, revenue: 31416, cost: 19265, advertising: 1818, commissions: 2513, tax: 1256, delivery: 471, profit: 6093 },
    { date: '01.01', fullDate: new Date('2026-01-01'), day: 'Чт', orders: 2, revenue: 32216, cost: 18745, advertising: 1702, commissions: 2577, tax: 1288, delivery: 483, profit: 7421 },
    { date: '02.01', fullDate: new Date('2026-01-02'), day: 'Пт', orders: 2, revenue: 32832, cost: 19321, advertising: 1245, commissions: 2626, tax: 1313, delivery: 492, profit: 7835 },
    { date: '03.01', fullDate: new Date('2026-01-03'), day: 'Сб', orders: 2, revenue: 28112, cost: 17533, advertising: 1191, commissions: 2249, tax: 1124, delivery: 422, profit: 5593 },
    { date: '04.01', fullDate: new Date('2026-01-04'), day: 'Вс', orders: 1, revenue: 15866, cost: 10115, advertising: 553, commissions: 1269, tax: 634, delivery: 238, profit: 3057 },
    { date: '05.01', fullDate: new Date('2026-01-05'), day: 'Пн', orders: 2, revenue: 27990, cost: 15455, advertising: 1479, commissions: 2239, tax: 1119, delivery: 420, profit: 7278 },
    { date: '06.01', fullDate: new Date('2026-01-06'), day: 'Вт', orders: 3, revenue: 40303, cost: 22572, advertising: 1472, commissions: 3224, tax: 1612, delivery: 604, profit: 10819 },
    { date: '07.01', fullDate: new Date('2026-01-07'), day: 'Ср', orders: 3, revenue: 36840, cost: 23484, advertising: 1593, commissions: 2947, tax: 1473, delivery: 552, profit: 6791 },
    { date: '08.01', fullDate: new Date('2026-01-08'), day: 'Чт', orders: 2, revenue: 22138, cost: 13826, advertising: 1117, commissions: 1771, tax: 885, delivery: 332, profit: 4207 },
    { date: '09.01', fullDate: new Date('2026-01-09'), day: 'Пт', orders: 2, revenue: 25807, cost: 14241, advertising: 1137, commissions: 2065, tax: 1032, delivery: 387, profit: 6945 },
    { date: '10.01', fullDate: new Date('2026-01-10'), day: 'Сб', orders: 2, revenue: 25580, cost: 15234, advertising: 1350, commissions: 2046, tax: 1023, delivery: 384, profit: 5543 },
    { date: '11.01', fullDate: new Date('2026-01-11'), day: 'Вс', orders: 1, revenue: 14249, cost: 9017, advertising: 695, commissions: 1140, tax: 570, delivery: 214, profit: 2613 },
    { date: '12.01', fullDate: new Date('2026-01-12'), day: 'Пн', orders: 3, revenue: 33280, cost: 18720, advertising: 1752, commissions: 2662, tax: 1331, delivery: 499, profit: 8316 },
    { date: '13.01', fullDate: new Date('2026-01-13'), day: 'Вт', orders: 2, revenue: 20652, cost: 11872, advertising: 1007, commissions: 1652, tax: 826, delivery: 310, profit: 4985 },
    { date: '14.01', fullDate: new Date('2026-01-14'), day: 'Ср', orders: 3, revenue: 49693, cost: 31281, advertising: 2225, commissions: 3975, tax: 1988, delivery: 745, profit: 9479 },
    { date: '15.01', fullDate: new Date('2026-01-15'), day: 'Чт', orders: 3, revenue: 32133, cost: 18923, advertising: 1687, commissions: 2571, tax: 1285, delivery: 482, profit: 7185 },
    { date: '16.01', fullDate: new Date('2026-01-16'), day: 'Пт', orders: 3, revenue: 33480, cost: 20863, advertising: 1619, commissions: 2678, tax: 1339, delivery: 502, profit: 6479 },
    { date: '17.01', fullDate: new Date('2026-01-17'), day: 'Сб', orders: 2, revenue: 21640, cost: 12528, advertising: 958, commissions: 1731, tax: 865, delivery: 324, profit: 5234 },
    { date: '18.01', fullDate: new Date('2026-01-18'), day: 'Вс', orders: 2, revenue: 27280, cost: 17413, advertising: 1462, commissions: 2182, tax: 1091, delivery: 409, profit: 4723 },
    { date: '19.01', fullDate: new Date('2026-01-19'), day: 'Пн', orders: 3, revenue: 36955, cost: 22084, advertising: 1925, commissions: 2956, tax: 1478, delivery: 554, profit: 7958 },
    { date: '20.01', fullDate: new Date('2026-01-20'), day: 'Вт', orders: 2, revenue: 29840, cost: 17904, advertising: 1193, commissions: 2387, tax: 1193, delivery: 447, profit: 6716 },
    { date: '21.01', fullDate: new Date('2026-01-21'), day: 'Ср', orders: 2, revenue: 34113, cost: 20468, advertising: 1364, commissions: 2729, tax: 1364, delivery: 512, profit: 7676 },
    { date: '22.01', fullDate: new Date('2026-01-22'), day: 'Чт', orders: 2, revenue: 24383, cost: 14630, advertising: 975, commissions: 1951, tax: 975, delivery: 366, profit: 5486 },
    { date: '23.01', fullDate: new Date('2026-01-23'), day: 'Пт', orders: 3, revenue: 43890, cost: 26334, advertising: 1755, commissions: 3511, tax: 1755, delivery: 658, profit: 9877 },
    { date: '24.01', fullDate: new Date('2026-01-24'), day: 'Сб', orders: 1, revenue: 19493, cost: 11696, advertising: 780, commissions: 1559, tax: 780, delivery: 292, profit: 4386 },
    { date: '25.01', fullDate: new Date('2026-01-25'), day: 'Вс', orders: 1, revenue: 14620, cost: 8772, advertising: 585, commissions: 1169, tax: 585, delivery: 219, profit: 3290 },
    { date: '26.01', fullDate: new Date('2026-01-26'), day: 'Пн', orders: 2, revenue: 34137, cost: 20482, advertising: 1365, commissions: 2731, tax: 1365, delivery: 512, profit: 7682 },
    { date: '27.01', fullDate: new Date('2026-01-27'), day: 'Вт', orders: 2, revenue: 29260, cost: 17556, advertising: 1170, commissions: 2341, tax: 1170, delivery: 439, profit: 6584 }
  ],

  topProducts: [
    {
      id: '1',
      name: 'iPhone 14 Pro 256GB Deep Purple',
      sku: 'APL-IP14P-256-DP',
      image: '📱',
      sales: 12,
      adSales: 4,
      revenue: 180000,
      cost: 110000,
      profit: 70000
    },
    {
      id: '2',
      name: 'Samsung Galaxy S23 Ultra 512GB',
      sku: 'SAM-S23U-512',
      image: '📱',
      sales: 8,
      adSales: 3,
      revenue: 144000,
      cost: 92000,
      profit: 52000
    },
    {
      id: '3',
      name: 'MacBook Pro 14" M2 Pro 16GB',
      sku: 'APL-MBP14-M2P-16',
      image: '💻',
      sales: 5,
      adSales: 2,
      revenue: 125000,
      cost: 85000,
      profit: 40000
    },
    {
      id: '4',
      name: 'AirPods Pro 2nd Generation',
      sku: 'APL-APP2',
      image: '🎧',
      sales: 15,
      adSales: 3,
      revenue: 75000,
      cost: 45000,
      profit: 30000
    },
    {
      id: '5',
      name: 'iPad Air 5th Gen 256GB WiFi',
      sku: 'APL-IPA5-256-W',
      image: '📱',
      sales: 7,
      adSales: 2,
      revenue: 98000,
      cost: 70000,
      profit: 28000
    }
  ],

  ordersByStatus: {
    pending: 3,
    processing: 8,
    shipped: 6,
    delivered: 26,
    cancelled: 2
  },

  // Источники продаж
  salesSources: {
    organic: 27,          // Органика (60%)
    advertising: 18       // Реклама (40%)
  },

  deliveryModes: {
    intercity: 12,        // Межгород
    myDelivery: 18,       // Моя доставка
    expressDelivery: 8,   // Экспресс доставка
    pickup: 7             // Самовывоз
  },

  // Данные по отзывам
  reviewsData: {
    totalReviews: 156,
    averageRating: 4.7,
    positiveReviews: 142,  // 4-5 звезд
    neutralReviews: 9,     // 3 звезды
    negativeReviews: 5,    // 1-2 звезды
    answeredReviews: 148,
    unansweredReviews: 8,
    ratingDistribution: [
      { stars: 5, count: 118 },
      { stars: 4, count: 24 },
      { stars: 3, count: 9 },
      { stars: 2, count: 3 },
      { stars: 1, count: 2 }
    ],
    recentReviews: [
      {
        id: 1,
        productName: 'iPhone 14 Pro 256GB Deep Purple',
        productSku: 'APL-IP14P-256-DP',
        customerName: 'Алексей М.',
        rating: 5,
        date: '2026-01-15',
        text: 'Отличный телефон! Доставка быстрая, все работает идеально. Продавец очень вежливый.',
        hasAnswer: true,
        answer: 'Спасибо за ваш отзыв! Рады, что покупка вас порадовала. Будем рады видеть вас снова!'
      },
      {
        id: 2,
        productName: 'Samsung Galaxy S23 Ultra 512GB',
        productSku: 'SAM-S23U-512',
        customerName: 'Марина К.',
        rating: 5,
        date: '2026-01-14',
        text: 'Превосходное качество, камера просто бомба! Рекомендую этот магазин.',
        hasAnswer: true,
        answer: 'Благодарим за высокую оценку! Приятно работать с такими покупателями!'
      },
      {
        id: 3,
        productName: 'AirPods Pro 2',
        productSku: 'APL-APP2',
        customerName: 'Дмитрий В.',
        rating: 4,
        date: '2026-01-13',
        text: 'Хорошие наушники, звук чистый. Немного туговато сидят в ушах, но в целом доволен.',
        hasAnswer: true,
        answer: 'Спасибо за отзыв! Советуем попробовать разные размеры насадок из комплекта.'
      },
      {
        id: 4,
        productName: 'MacBook Pro 14" M2 Pro',
        productSku: 'APL-MBP14-M2P',
        customerName: 'Сергей Н.',
        rating: 5,
        date: '2026-01-12',
        text: 'Мощный ноутбук для работы и креатива. Доставили на следующий день!',
        hasAnswer: false,
        answer: null
      },
      {
        id: 5,
        productName: 'Apple Watch Ultra',
        productSku: 'APL-AWU',
        customerName: 'Елена П.',
        rating: 3,
        date: '2026-01-11',
        text: 'Часы хорошие, но ожидала большего за такую цену. Ремешок немного жестковат.',
        hasAnswer: false,
        answer: null
      },
      {
        id: 6,
        productName: 'iPhone 14 Pro Max 256GB',
        productSku: 'APL-IP14PM-256',
        customerName: 'Игорь Т.',
        rating: 2,
        date: '2026-01-10',
        text: 'Долго ждал доставку, почти неделю. Телефон нормальный, но сервис подкачал.',
        hasAnswer: true,
        answer: 'Приносим извинения за задержку! Это было связано с праздниками. Благодарим за понимание.'
      },
      {
        id: 7,
        productName: 'Samsung Galaxy Buds2 Pro',
        productSku: 'SAM-GB2P',
        customerName: 'Анна Л.',
        rating: 5,
        date: '2026-01-09',
        text: 'Лучшие беспроводные наушники! Шумоподавление на высоте.',
        hasAnswer: true,
        answer: 'Спасибо за отзыв! Рады, что наушники оправдали ожидания!'
      },
      {
        id: 8,
        productName: 'iPad Air 5th Gen 256GB',
        productSku: 'APL-IPA5-256',
        customerName: 'Павел Ш.',
        rating: 5,
        date: '2026-01-08',
        text: 'Отличный планшет для учебы и развлечений. Дети довольны!',
        hasAnswer: false,
        answer: null
      },
      {
        id: 9,
        productName: 'iPhone 15 Pro Max 512GB',
        productSku: 'APL-IP15PM-512',
        customerName: 'Виктор К.',
        rating: 5,
        date: '2026-01-07',
        text: 'Лучший телефон который у меня был! Камера просто космос.',
        hasAnswer: false,
        answer: null
      },
      {
        id: 10,
        productName: 'Samsung Galaxy Z Fold5',
        productSku: 'SAM-ZF5',
        customerName: 'Ольга Р.',
        rating: 4,
        date: '2026-01-07',
        text: 'Интересный форм-фактор, но тяжеловат. В остальном отлично.',
        hasAnswer: false,
        answer: null
      },
      {
        id: 11,
        productName: 'Apple AirPods Max',
        productSku: 'APL-APM',
        customerName: 'Денис С.',
        rating: 5,
        date: '2026-01-06',
        text: 'Звук потрясающий, шумоподавление на высшем уровне!',
        hasAnswer: false,
        answer: null
      },
      {
        id: 12,
        productName: 'MacBook Air M3',
        productSku: 'APL-MBA-M3',
        customerName: 'Наталья Б.',
        rating: 5,
        date: '2026-01-05',
        text: 'Легкий, быстрый, батарея держит весь день. Очень довольна!',
        hasAnswer: false,
        answer: null
      },
      {
        id: 13,
        productName: 'iPad Pro 12.9"',
        productSku: 'APL-IPP-129',
        customerName: 'Артем Г.',
        rating: 3,
        date: '2026-01-04',
        text: 'Хороший планшет, но цена кусается. За эти деньги ожидал большего.',
        hasAnswer: false,
        answer: null
      },
      {
        id: 14,
        productName: 'Samsung Galaxy Watch 6',
        productSku: 'SAM-GW6',
        customerName: 'Мария Ф.',
        rating: 5,
        date: '2026-01-03',
        text: 'Отличные часы! Точно отслеживают сон и тренировки.',
        hasAnswer: false,
        answer: null
      },
      {
        id: 15,
        productName: 'iPhone 14 128GB',
        productSku: 'APL-IP14-128',
        customerName: 'Константин Л.',
        rating: 2,
        date: '2026-01-03',
        text: 'Пришел с царапиной на экране. Пришлось менять.',
        hasAnswer: false,
        answer: null
      }
    ],
    // Динамика отзывов по дням
    dailyReviews: [
      { date: '01.01', positive: 3, neutral: 0, negative: 0 },
      { date: '02.01', positive: 4, neutral: 1, negative: 0 },
      { date: '03.01', positive: 2, neutral: 0, negative: 1 },
      { date: '04.01', positive: 5, neutral: 0, negative: 0 },
      { date: '05.01', positive: 3, neutral: 1, negative: 0 },
      { date: '06.01', positive: 4, neutral: 0, negative: 0 },
      { date: '07.01', positive: 6, neutral: 0, negative: 1 },
      { date: '08.01', positive: 3, neutral: 1, negative: 0 },
      { date: '09.01', positive: 5, neutral: 0, negative: 0 },
      { date: '10.01', positive: 4, neutral: 1, negative: 1 },
      { date: '11.01', positive: 3, neutral: 0, negative: 0 },
      { date: '12.01', positive: 5, neutral: 1, negative: 0 },
      { date: '13.01', positive: 4, neutral: 0, negative: 0 },
      { date: '14.01', positive: 6, neutral: 0, negative: 1 },
      { date: '15.01', positive: 5, neutral: 1, negative: 0 }
    ]
  }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 h-24"></div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-6 h-80"></div>
        </div>
      </div>
    </div>
  );
}

// Основной контент страницы
function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['finances', 'sales', 'reviews'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'finances';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

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
  const [productSort, setProductSort] = useState<'margin' | 'profit' | 'revenue'>('margin');
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 10;

  // Состояние сворачиваемых секций в табе Sales
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    revenue: false,      // Структура выручки
    sources: false,      // Источники продаж и способы доставки
    adProducts: false    // Рентабельность по товарам
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Модальное окно для детализации по городам (межгород)
  const [showCitiesModal, setShowCitiesModal] = useState(false);

  // Попап для детализации из таблицы "Детализация по дням"
  const [showTableDayPopup, setShowTableDayPopup] = useState(false);
  const [selectedTableDay, setSelectedTableDay] = useState<DailyData | null>(null);
  const [showTotalPopup, setShowTotalPopup] = useState(false);

  // Попапы для источников продаж
  const [showOrganicPopup, setShowOrganicPopup] = useState(false);
  const [showAdsPopup, setShowAdsPopup] = useState(false);
  const [showOfflineSourcePopup, setShowOfflineSourcePopup] = useState(false);

  // Попап для отзывов по дню
  const [showReviewsDayPopup, setShowReviewsDayPopup] = useState(false);
  const [selectedReviewsDay, setSelectedReviewsDay] = useState<string | null>(null);
  const [selectedReviewDayIdx, setSelectedReviewDayIdx] = useState<number | null>(null);

  // Попапы для способов доставки
  const [showMyDeliveryPopup, setShowMyDeliveryPopup] = useState(false);
  const [showExpressPopup, setShowExpressPopup] = useState(false);
  const [showPickupPopup, setShowPickupPopup] = useState(false);
  const [showOfflineDeliveryPopup, setShowOfflineDeliveryPopup] = useState(false);
  const [selectedCityPopup, setSelectedCityPopup] = useState<string | null>(null);

  // Выпадающий список городов в межгороде
  const [showCitiesDropdown, setShowCitiesDropdown] = useState(false);

  // Попап детализации по товару
  const [showProductPopup, setShowProductPopup] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedProduct, setSelectedProduct] = useState<TopProduct | null>(null);
  const [productPopupPeriod, setProductPopupPeriod] = useState<'week' | 'month' | '3months'>('week');

  // Попап заказов в пути (ожидают поступления)
  const [showPendingOrdersPopup, setShowPendingOrdersPopup] = useState(false);

  // Операционные расходы
  const [operationalExpenses, setOperationalExpenses] = useState<OperationalExpense[]>([
    { id: '1', name: 'Зарплата сотрудников', amount: 500000, startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31') },
    { id: '2', name: 'Аренда офиса', amount: 150000, startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31') },
  ]);
  const [showExpensesPopup, setShowExpensesPopup] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseStartDate, setNewExpenseStartDate] = useState<Date>(new Date('2026-01-01'));
  const [newExpenseEndDate, setNewExpenseEndDate] = useState<Date>(new Date('2026-01-31'));
  const [showExpenseCalendar, setShowExpenseCalendar] = useState(false);

  // Функция для добавления нового расхода
  const handleAddExpense = () => {
    if (newExpenseName && newExpenseAmount && newExpenseStartDate && newExpenseEndDate) {
      const newExpense: OperationalExpense = {
        id: Date.now().toString(),
        name: newExpenseName,
        amount: parseFloat(newExpenseAmount),
        startDate: newExpenseStartDate,
        endDate: newExpenseEndDate,
      };
      setOperationalExpenses([...operationalExpenses, newExpense]);
      setNewExpenseName('');
      setNewExpenseAmount('');
      setNewExpenseStartDate(new Date('2026-01-01'));
      setNewExpenseEndDate(new Date('2026-01-31'));
    }
  };

  // Функция для удаления расхода
  const handleDeleteExpense = (id: string) => {
    setOperationalExpenses(operationalExpenses.filter(exp => exp.id !== id));
  };

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

  // Фильтрация данных по выбранному периоду
  const getFilteredData = () => {
    if (!startDate || !endDate) {
      // Возвращаем данные с пересчитанными расходами и прибылью
      return {
        ...mockAnalyticsData,
        dailyData: mockAnalyticsData.dailyData.map(day => {
          const totalExpenses = day.cost + day.advertising + day.tax + day.commissions + day.delivery;
          const recalculatedProfit = day.revenue - totalExpenses;
          return {
            ...day,
            totalExpenses,
            profit: recalculatedProfit
          };
        })
      };
    }

    // Фильтруем dailyData по выбранному периоду и пересчитываем расходы и прибыль
    const startTime = new Date(startDate);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(endDate);
    endTime.setHours(23, 59, 59, 999);

    const filteredDailyData = mockAnalyticsData.dailyData
      .filter(day => {
        const dayDate = new Date(day.fullDate);
        dayDate.setHours(12, 0, 0, 0);
        return dayDate >= startTime && dayDate <= endTime;
      })
      .map(day => {
        const totalExpenses = day.cost + day.advertising + day.tax + day.commissions + day.delivery;
        const recalculatedProfit = day.revenue - totalExpenses;
        return {
          ...day,
          totalExpenses,
          profit: recalculatedProfit
        };
      });

    // Проверяем, если период больше 31 дня - группируем по месяцам
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const chartData = daysDifference > 31 ? groupByMonth(filteredDailyData) : filteredDailyData;

    // Пересчитываем метрики на основе отфильтрованных данных
    const totalOrders = filteredDailyData.reduce((sum, day) => sum + day.orders, 0);
    const totalRevenue = filteredDailyData.reduce((sum, day) => sum + day.revenue, 0);
    const totalCost = filteredDailyData.reduce((sum, day) => sum + day.cost, 0);
    const totalAdvertising = filteredDailyData.reduce((sum, day) => sum + day.advertising, 0);
    const totalCommissions = filteredDailyData.reduce((sum, day) => sum + day.commissions, 0);
    const totalTax = filteredDailyData.reduce((sum, day) => sum + day.tax, 0);
    const totalDelivery = filteredDailyData.reduce((sum, day) => sum + day.delivery, 0);
    const totalProfit = filteredDailyData.reduce((sum, day) => sum + day.profit, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Рассчитываем источники продаж и способы доставки на основе заказов за период
    // Используем процентное соотношение от общего числа заказов
    const organicPercent = 0.6; // 60% органика

    const organicOrders = Math.max(1, Math.round(totalOrders * organicPercent));
    const advertisingOrders = Math.max(totalOrders > 0 ? 1 : 0, totalOrders - organicOrders);

    // Способы доставки в процентах
    const intercityPercent = 0.25;
    const myDeliveryPercent = 0.42;
    const expressPercent = 0.17;
    const pickupPercent = 0.16;

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
      topProducts: mockAnalyticsData.topProducts,
      ordersByStatus: {
        pending: Math.max(totalOrders > 0 ? 1 : 0, Math.round(totalOrders * 0.07)),
        processing: Math.max(totalOrders > 0 ? 1 : 0, Math.round(totalOrders * 0.18)),
        shipped: Math.max(totalOrders > 0 ? 1 : 0, Math.round(totalOrders * 0.13)),
        delivered: Math.max(totalOrders > 0 ? 1 : 0, Math.round(totalOrders * 0.58)),
        cancelled: Math.round(totalOrders * 0.04),
      },
      salesSources: {
        organic: organicOrders,
        advertising: advertisingOrders,
      },
      ordersBySource: {
        organic: organicOrders,
        ads: advertisingOrders,
        offline: Math.round(totalOrders * 0.05),
      },
      deliveryModes: {
        intercity: Math.max(totalOrders > 0 ? 1 : 0, Math.round(totalOrders * intercityPercent)),
        myDelivery: Math.max(totalOrders > 0 ? 1 : 0, Math.round(totalOrders * myDeliveryPercent)),
        expressDelivery: Math.max(totalOrders > 0 ? 1 : 0, Math.round(totalOrders * expressPercent)),
        pickup: Math.max(totalOrders > 0 ? 1 : 0, Math.round(totalOrders * pickupPercent)),
      },
      pendingOrders: mockAnalyticsData.pendingOrders,
      reviewsData: mockAnalyticsData.reviewsData,
    };
  };

  // Используем отфильтрованные данные
  const data = getFilteredData();

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
    const prevPeriodData = mockAnalyticsData.dailyData
      .filter(day => {
        const dayDate = day.fullDate;
        return dayDate >= prevStartDate && dayDate <= prevEndDate;
      })
      .map((day, index) => {
        const totalExpenses = day.cost + day.advertising + day.tax + day.commissions + day.delivery;
        const recalculatedProfit = day.revenue - totalExpenses;

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
  const combinedChartData = data.dailyData.map((currentDay, index) => {
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
  const offlineOrders = Math.max(1, Math.round(data.totalOrders * 0.05));

  const salesSourcesData = [
    { name: 'Органика', value: data.salesSources.organic },
    { name: 'Реклама', value: data.salesSources.advertising },
    { name: 'Оффлайн', value: offlineOrders },
  ];

  const deliveryData = [
    { name: 'Межгород', value: data.deliveryModes.intercity },
    { name: 'Моя доставка', value: data.deliveryModes.myDelivery },
    { name: 'Экспресс доставка', value: data.deliveryModes.expressDelivery },
    { name: 'Самовывоз', value: data.deliveryModes.pickup },
    { name: 'Оффлайн', value: offlineOrders },
  ];

  // Данные по городам для межгорода (распределение заказов)
  const intercityOrders = data.deliveryModes.intercity;
  const citiesData = [
    { name: 'Астана', orders: Math.round(intercityOrders * 0.32), percent: 32 },
    { name: 'Шымкент', orders: Math.round(intercityOrders * 0.18), percent: 18 },
    { name: 'Караганда', orders: Math.round(intercityOrders * 0.14), percent: 14 },
    { name: 'Актобе', orders: Math.round(intercityOrders * 0.11), percent: 11 },
    { name: 'Павлодар', orders: Math.round(intercityOrders * 0.09), percent: 9 },
    { name: 'Атырау', orders: Math.round(intercityOrders * 0.07), percent: 7 },
    { name: 'Костанай', orders: Math.round(intercityOrders * 0.05), percent: 5 },
    { name: 'Другие города', orders: Math.round(intercityOrders * 0.04), percent: 4 },
  ];

  // Расчет процента рентабельности
  const profitMargin = ((data.totalProfit / data.totalRevenue) * 100).toFixed(1);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 lg:mb-8"
        >
          <div className="mb-4 lg:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Аналитика</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Детальная статистика по вашим заказам</p>
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
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Финансы
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'sales'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Заказы и реклама
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'reviews'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Отзывы
                </button>
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm relative w-full lg:w-auto" ref={calendarRef}>
              <div className="mb-2 sm:mb-3">
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm hover:border-emerald-500 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className={startDate && endDate ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    {formatDateRange()}
                  </span>
                </button>
              </div>

              {/* Quick Date Filters */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => handleQuickFilter('yesterday')}
                  className="px-2.5 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Вчера
                </button>
                <button
                  onClick={() => handleQuickFilter('week')}
                  className="px-2.5 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Неделя
                </button>
                <button
                  onClick={() => handleQuickFilter('month')}
                  className="px-2.5 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Месяц
                </button>
                <button
                  onClick={() => handleQuickFilter('year')}
                  className="px-2.5 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
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
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'finances' && (
          <>
            {/* Period Info */}
            <div className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Период: <span className="text-gray-500">{formatShortPeriod()}</span></span>
              <span className="text-gray-300">|</span>
              <span>{startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0} дн.</span>
            </div>

            {/* Finance Stats Cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8"
            >
              <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Поступления</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{(data.totalRevenue / 1000).toFixed(0)}K ₸</div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <span className="bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-medium">{formatShortPeriod()}</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 rotate-180" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Расходы</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900">
                  {((data.totalCost + data.totalAdvertising + data.totalTax + data.totalCommissions + data.totalDelivery) / 1000).toFixed(0)}K ₸
                </div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <button
                    onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                    className="flex items-center gap-0.5 bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-medium hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <span>Детали</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showExpenseDetails ? 'rotate-180' : ''}`} />
                  </button>
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
                      <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-gray-600">
                          <span>Себест.</span>
                          <span className="font-medium">{(data.totalCost / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Реклама</span>
                          <span className="font-medium">{(data.totalAdvertising / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Налог</span>
                          <span className="font-medium">{(data.totalTax / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Комиссия</span>
                          <span className="font-medium">{(data.totalCommissions / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Доставка</span>
                          <span className="font-medium">{(data.totalDelivery / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Прибыль</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-emerald-600">{(data.totalProfit / 1000).toFixed(0)}K ₸</div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">{profitMargin}% маржа</span>
                </div>
              </motion.div>
            </motion.div>

        {/* Financial Charts */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-3 sm:gap-6 mb-6 sm:mb-8"
        >
          {/* Money Flow Chart - Line */}
          <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-semibold text-gray-900">Движение денег</h3>
                <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium">{formatShortPeriod()}</span>
                {/* Help Icon with Tooltip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowChartHelp(!showChartHelp)}
                    className="focus:outline-none"
                  >
                    <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-gray-600 cursor-help" />
                  </button>
                </div>
              </div>

              {/* Previous Period Toggle */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-sm text-gray-500">Прошлый период</span>
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
                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showRevenueLine ? 'bg-sky-500' : 'bg-gray-300'}`} />
                Поступления
              </button>
              <button
                onClick={() => setShowExpensesLine(!showExpensesLine)}
                className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  showExpensesLine
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showExpensesLine ? 'bg-rose-400' : 'bg-gray-300'}`} />
                Расходы
              </button>
              <button
                onClick={() => setShowProfitLine(!showProfitLine)}
                className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  showProfitLine
                    ? 'bg-teal-100 text-teal-700 border border-teal-200'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showProfitLine ? 'bg-teal-400' : 'bg-gray-300'}`} />
                Прибыль
              </button>
            </div>

            <ResponsiveContainer width="100%" height={280} className="sm:!h-[450px]">
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
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
          </motion.div>

          {/* Детализация данных графика */}
          <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Детализация по дням</h3>
              <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium">{formatShortPeriod()}</span>
            </div>
            <div>
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 sm:py-3 px-1 sm:px-2 font-medium text-gray-500 text-left">Дата</th>
                    <th className="py-2 sm:py-3 px-1 sm:px-2 font-medium text-gray-500 text-right">Поступ.</th>
                    <th className="py-2 sm:py-3 px-1 sm:px-2 font-medium text-gray-500 text-right">Расходы</th>
                    <th className="py-2 sm:py-3 px-1 sm:px-2 font-medium text-gray-500 text-right">Прибыль</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyData.map((day, index) => {
                    const dayExpenses = day.cost + day.advertising + day.commissions + day.tax + day.delivery;
                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedTableDay({ ...day, totalExpenses: dayExpenses } as DailyData);
                          setShowTableDayPopup(true);
                        }}
                      >
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-900 text-left whitespace-nowrap">{day.date}{day.day ? ` (${day.day})` : ''}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-700 font-medium text-right whitespace-nowrap">
                          {day.revenue.toLocaleString('ru-RU')} ₸
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-700 font-medium text-right whitespace-nowrap">
                          {dayExpenses.toLocaleString('ru-RU')} ₸
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-emerald-600 font-medium text-right whitespace-nowrap">
                          {day.profit.toLocaleString('ru-RU')} ₸
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    className="bg-gray-50 font-semibold hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setShowTotalPopup(true)}
                  >
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-900 text-left whitespace-nowrap">Итого</td>
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-900 text-right whitespace-nowrap">
                      {data.totalRevenue.toLocaleString('ru-RU')} ₸
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-gray-900 text-right whitespace-nowrap">
                      {(data.totalCost + data.totalAdvertising + data.totalCommissions + data.totalTax + data.totalDelivery).toLocaleString('ru-RU')} ₸
                    </td>
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-emerald-600 text-right whitespace-nowrap">
                      {data.totalProfit.toLocaleString('ru-RU')} ₸
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        </motion.div>
          </>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <>
            {/* Period Info + кнопка расходов */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Период: <span className="text-gray-500">{formatShortPeriod()}</span></span>
                <span className="text-gray-300">|</span>
                <span>{data.totalOrders} заказов</span>
              </div>
              <button
                onClick={() => setShowExpensesPopup(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Операционные расходы
              </button>
            </div>

            {/* Sales Stats Cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
            >
              <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Заказов</span>
                  <HelpTooltip text="Общее количество заказов за выбранный период" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{data.totalOrders}</div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">{formatShortPeriod()}</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Ср. чек</span>
                  <HelpTooltip text="Средняя сумма одного заказа (выручка ÷ количество заказов)" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{(data.avgOrderValue / 1000).toFixed(0)}K ₸</div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">{formatShortPeriod()}</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Конверсия</span>
                  <HelpTooltip text="Процент доставленных заказов от общего числа" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-blue-600">58%</div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{formatShortPeriod()}</span>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setShowPendingOrdersPopup(true)}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">В пути</span>
                  <HelpTooltip text="Заказы в процессе доставки до клиента" />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{data.pendingOrders?.count || 0}</div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">{((data.pendingOrders?.totalAmount || 0) / 1000000).toFixed(1)}M ₸ ожидает</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Orders Chart - Full Width with Cost/Ads/Profit breakdown */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-6 sm:mb-8"
            >
              <motion.div variants={itemVariants} className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl overflow-hidden">
                {/* Заголовок - кликабельный для сворачивания */}
                <div
                  onClick={() => toggleSection('revenue')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Структура выручки</h3>
                      <p className="text-[10px] text-gray-400">{startDate && endDate ? `${startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <div
                      className="flex flex-col items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[9px] text-gray-400">{showAdsOnly ? 'реклама' : 'все'}</span>
                      <button
                        onClick={() => setShowAdsOnly(!showAdsOnly)}
                        className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${
                          showAdsOnly ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${
                          showAdsOnly ? 'translate-x-4' : 'translate-x-0'
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
                      className="px-3 sm:px-4 pb-3 sm:pb-4"
                    >

                {(() => {
                  // Подготовка данных для stacked bar chart
                  const adsRatio = data.ordersBySource.ads / data.totalOrders; // Доля рекламных заказов

                  const chartData = data.dailyData.map(day => {
                    // Если показываем только рекламу - берём пропорциональную часть
                    const multiplier = showAdsOnly ? adsRatio : 1;
                    const dayRevenue = day.revenue * multiplier;
                    const dayCost = day.cost * multiplier;
                    const dayAds = day.advertising; // Реклама всегда полная
                    // Операционные расходы для конкретной даты
                    const dayOpExpenses = (day.fullDate ? calculateDailyOperationalExpensesForDate(day.fullDate) : 0) * multiplier;
                    const dayProfit = dayRevenue - dayCost - dayAds - dayOpExpenses;

                    // Проценты для каждой части
                    const costPercent = dayRevenue > 0 ? ((dayCost / dayRevenue) * 100).toFixed(0) : 0;
                    const adsPercent = dayRevenue > 0 ? ((dayAds / dayRevenue) * 100).toFixed(0) : 0;
                    const opExpensesPercent = dayRevenue > 0 ? ((dayOpExpenses / dayRevenue) * 100).toFixed(0) : 0;
                    const profitPercent = dayRevenue > 0 ? ((Math.max(0, dayProfit) / dayRevenue) * 100).toFixed(0) : 0;

                    return {
                      date: day.date,
                      day: day.day || '',
                      cost: dayCost,
                      advertising: dayAds,
                      opExpenses: dayOpExpenses,
                      profit: Math.max(0, dayProfit),
                      loss: dayProfit < 0 ? Math.abs(dayProfit) : 0,
                      revenue: dayRevenue,
                      costPercent,
                      adsPercent,
                      opExpensesPercent,
                      profitPercent: dayProfit >= 0 ? profitPercent : 0,
                      orders: showAdsOnly ? Math.round(day.orders * adsRatio) : day.orders
                    };
                  });

                  return (
                    <>
                      <ResponsiveContainer width="100%" height={200} className="sm:!h-[220px]">
                        <BarChart data={chartData} margin={{ top: 15, right: 5, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#9ca3af" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                          <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const item = payload[0]?.payload;
                                return (
                                  <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                                    <p className="font-semibold text-gray-900 mb-2">{label} ({item?.day})</p>
                                    <p className="text-sm text-gray-600 mb-1">
                                      Заказов: <span className="font-medium">{item?.orders}</span>
                                    </p>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between gap-4">
                                        <span className="text-rose-500">Себестоимость:</span>
                                        <span className="font-medium">{item?.cost?.toLocaleString('ru-RU')} ₸ ({item?.costPercent}%)</span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-amber-500">Реклама:</span>
                                        <span className="font-medium">{item?.advertising?.toLocaleString('ru-RU')} ₸ ({item?.adsPercent}%)</span>
                                      </div>
                                      {item?.opExpenses > 0 && (
                                        <div className="flex justify-between gap-4">
                                          <span className="text-indigo-500">Опер. расходы:</span>
                                          <span className="font-medium">{Math.round(item?.opExpenses)?.toLocaleString('ru-RU')} ₸ ({item?.opExpensesPercent}%)</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between gap-4">
                                        <span className="text-emerald-500">Прибыль:</span>
                                        <span className="font-medium">{item?.profit?.toLocaleString('ru-RU')} ₸ ({item?.profitPercent}%)</span>
                                      </div>
                                      {item?.loss > 0 && (
                                        <div className="flex justify-between gap-4">
                                          <span className="text-red-600">Убыток:</span>
                                          <span className="font-medium text-red-600">-{item?.loss?.toLocaleString('ru-RU')} ₸</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between gap-4 pt-1 border-t mt-1">
                                        <span className="text-gray-700 font-medium">Выручка:</span>
                                        <span className="font-bold">{item?.revenue?.toLocaleString('ru-RU')} ₸</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: '9px' }}
                            iconSize={8}
                            formatter={(value) => {
                              const labels: Record<string, string> = {
                                cost: 'Себест.',
                                advertising: 'Рекл.',
                                opExpenses: 'Опер.',
                                profit: 'Приб.'
                              };
                              return labels[value] || value;
                            }}
                          />
                          <Bar dataKey="cost" name="cost" stackId="a" fill="#f87171" />
                          <Bar dataKey="advertising" name="advertising" stackId="a" fill="#fbbf24" />
                          <Bar dataKey="opExpenses" name="opExpenses" stackId="a" fill="#818cf8" />
                          <Bar dataKey="profit" name="profit" stackId="a" fill="#34d399" radius={[3, 3, 0, 0]}>
                            <LabelList
                              dataKey="revenue"
                              position="top"
                              formatter={(value) => `${(Number(value) / 1000).toFixed(0)}K`}
                              style={{ fontSize: 8, fill: '#6b7280', fontWeight: 500 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Итоги под графиком */}
                      <div className="mt-3 grid grid-cols-4 gap-1.5">
                        <div className="bg-white rounded-lg px-2 py-1.5 shadow-sm text-center">
                          <div className="text-[9px] text-gray-400">себест.</div>
                          <div className="text-xs font-semibold text-rose-500">
                            {((showAdsOnly ? data.totalCost * adsRatio : data.totalCost) / 1000).toFixed(0)}K
                          </div>
                          <div className="text-[8px] text-rose-400">
                            {(((showAdsOnly ? data.totalCost * adsRatio : data.totalCost) / (showAdsOnly ? data.totalRevenue * adsRatio : data.totalRevenue)) * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="bg-white rounded-lg px-2 py-1.5 shadow-sm text-center">
                          <div className="text-[9px] text-gray-400">реклама</div>
                          <div className="text-xs font-semibold text-amber-500">
                            {(data.totalAdvertising / 1000).toFixed(0)}K
                          </div>
                          <div className="text-[8px] text-amber-400">
                            {((data.totalAdvertising / (showAdsOnly ? data.totalRevenue * adsRatio : data.totalRevenue)) * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="bg-white rounded-lg px-2 py-1.5 shadow-sm text-center">
                          <div className="text-[9px] text-gray-400">цена клиента</div>
                          <div className="text-xs font-semibold text-sky-500">
                            {(() => {
                              const orders = showAdsOnly ? data.ordersBySource.ads : data.totalOrders;
                              const cac = orders > 0 ? data.totalAdvertising / orders : 0;
                              return `${(cac / 1000).toFixed(1)}K`;
                            })()}
                          </div>
                          <div className="text-[8px] text-sky-400">
                            {showAdsOnly ? data.ordersBySource.ads : data.totalOrders} зак.
                          </div>
                        </div>
                        <div className="bg-white rounded-lg px-2 py-1.5 shadow-sm text-center">
                          <div className="text-[9px] text-gray-400">прибыль</div>
                          <div className="text-xs font-semibold text-emerald-500">
                            {(() => {
                              const rev = showAdsOnly ? data.totalRevenue * adsRatio : data.totalRevenue;
                              const cost = showAdsOnly ? data.totalCost * adsRatio : data.totalCost;
                              const profit = rev - cost - data.totalAdvertising;
                              return `${(profit / 1000).toFixed(0)}K`;
                            })()}
                          </div>
                          <div className="text-[8px] text-emerald-400">
                            {(() => {
                              const rev = showAdsOnly ? data.totalRevenue * adsRatio : data.totalRevenue;
                              const cost = showAdsOnly ? data.totalCost * adsRatio : data.totalCost;
                              const profit = rev - cost - data.totalAdvertising;
                              return `${((profit / rev) * 100).toFixed(0)}%`;
                            })()}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* Рентабельность по товарам */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-6 sm:mb-8"
            >
              <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl overflow-hidden">
                {/* Заголовок - кликабельный для сворачивания */}
                <div
                  onClick={() => toggleSection('adProducts')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Маржинальность по товарам</h3>
                      <p className="text-[10px] text-gray-400">{startDate && endDate ? `${startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <div
                      className="flex flex-col items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[9px] text-gray-400">{showAdsOnlyROI ? 'реклама' : 'все продажи'}</span>
                      <button
                        onClick={() => setShowAdsOnlyROI(!showAdsOnlyROI)}
                        className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${
                          showAdsOnlyROI ? 'bg-indigo-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${
                          showAdsOnlyROI ? 'translate-x-4' : 'translate-x-0'
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
                      <div className="p-4 sm:p-5 bg-white/50">
                {(() => {
                  // Расчёт данных для каждого товара
                  const totalAdSales = data.topProducts.reduce((sum, p) => sum + (p.adSales || 0), 0);

                  const productsWithData = data.topProducts.map(product => {
                    if (showAdsOnlyROI) {
                      // Режим "только реклама" - показываем только рекламные продажи
                      const adSales = product.adSales || 0;
                      const adSalesRatio = product.sales > 0 ? adSales / product.sales : 0;
                      const adRevenue = Math.round(product.revenue * adSalesRatio);
                      const adCost = Math.round(product.cost * adSalesRatio);
                      const adExpense = totalAdSales > 0 ? Math.round((adSales / totalAdSales) * data.totalAdvertising) : 0;
                      const adProfit = adRevenue - adCost - adExpense;
                      const margin = adRevenue > 0 ? Math.round((adProfit / adRevenue) * 100) : 0;

                      return {
                        ...product,
                        displaySales: adSales,
                        totalSales: product.sales,
                        displayCost: adCost,
                        displayRevenue: adRevenue,
                        displayAdExpense: adExpense,
                        displayProfit: adProfit,
                        displayMargin: margin,
                        isAdsMode: true
                      };
                    } else {
                      // Режим "все продажи" - маржинальность
                      const adSales = product.adSales || 0;
                      const adExpense = totalAdSales > 0 ? Math.round((adSales / totalAdSales) * data.totalAdvertising) : 0;
                      const totalProfit = product.profit;
                      const margin = product.revenue > 0 ? Math.round((totalProfit / product.revenue) * 100) : 0;

                      return {
                        ...product,
                        displaySales: product.sales,
                        totalSales: product.sales,
                        displayCost: product.cost,
                        displayRevenue: product.revenue,
                        displayAdExpense: adExpense,
                        displayProfit: totalProfit,
                        displayMargin: margin,
                        isAdsMode: false
                      };
                    }
                  })
                  // Фильтр по поиску
                  .filter(product =>
                    !productSearch || product.name.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  // Сортировка
                  .sort((a, b) => {
                    if (productSort === 'margin') return b.displayMargin - a.displayMargin;
                    if (productSort === 'profit') return b.displayProfit - a.displayProfit;
                    return b.displayRevenue - a.displayRevenue;
                  });

                  // Пагинация
                  const totalPages = Math.ceil(productsWithData.length / PRODUCTS_PER_PAGE);
                  const startIdx = (productPage - 1) * PRODUCTS_PER_PAGE;
                  const displayedProducts = productsWithData.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

                  return (
                    <>
                      {/* Поиск и сортировка */}
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Поиск..."
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setProductPage(1); // Сброс на первую страницу при поиске
                          }}
                          className="flex-1 max-w-[120px] h-5 px-1.5 text-[9px] border border-gray-200 rounded bg-white focus:outline-none focus:border-indigo-400"
                        />
                        <span className="text-[9px] text-gray-400">сорт:</span>
                        {[
                          { key: 'margin', label: 'маржа' },
                          { key: 'profit', label: 'прибыль' },
                          { key: 'revenue', label: 'выручка' }
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => {
                              setProductSort(opt.key as 'margin' | 'profit' | 'revenue');
                              setProductPage(1); // Сброс на первую страницу при смене сортировки
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] transition-colors ${
                              productSort === opt.key
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {/* Карточки товаров */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {displayedProducts.map((product) => (
                          <div key={product.id} className="bg-white rounded-lg px-2.5 py-1.5 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm text-gray-900 truncate flex-1">{product.name}</p>
                              <span className="text-xs text-gray-600 whitespace-nowrap">{product.displaySales} шт</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${
                                  product.displayMargin >= 40 ? 'text-emerald-600' :
                                  product.displayMargin >= 20 ? 'text-amber-600' :
                                  product.displayMargin >= 0 ? 'text-orange-500' :
                                  'text-red-500'
                                }`}>
                                  <span className="text-[9px] opacity-50 font-normal text-gray-500">маржа</span> {product.displayMargin}%
                                </span>
                                {product.displayAdExpense > 0 && (
                                  <span className="text-amber-600"><span className="text-[9px] opacity-50">рекл</span> {(product.displayAdExpense / 1000).toFixed(0)}K</span>
                                )}
                                <span><span className="text-[9px] opacity-50">цена 1 клиента</span> {product.displaySales > 0 ? Math.round(product.displayRevenue / product.displaySales / 1000) : 0}K</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span><span className="text-[9px] opacity-50">выр</span> {(product.displayRevenue / 1000).toFixed(0)}K</span>
                                <span className={product.displayProfit >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                                  <span className="text-[9px] opacity-50 font-normal">приб</span> {product.displayProfit >= 0 ? '+' : ''}{(product.displayProfit / 1000).toFixed(0)}K
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Пагинация */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <button
                            onClick={() => setProductPage(p => Math.max(1, p - 1))}
                            disabled={productPage === 1}
                            className="px-2 py-0.5 text-[10px] text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
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
                                className={`w-6 h-6 text-[10px] rounded transition-colors ${
                                  productPage === pageNum
                                    ? 'bg-indigo-500 text-white'
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setProductPage(p => Math.min(totalPages, p + 1))}
                            disabled={productPage === totalPages}
                            className="px-2 py-0.5 text-[10px] text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            →
                          </button>
                          <span className="text-[9px] text-gray-400 ml-2">
                            {productsWithData.length} товаров
                          </span>
                        </div>
                      )}
                      {productsWithData.length === 0 && (
                        <div className="text-center text-[10px] text-gray-400 py-2">Ничего не найдено</div>
                      )}
                    </>
                  );
                })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* Pie Charts - Side by Side */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-6 sm:mb-8"
            >
              <motion.div variants={itemVariants} className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-2xl overflow-hidden">
                {/* Заголовок - кликабельный для сворачивания */}
                <div
                  onClick={() => toggleSection('sources')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Источники и способы доставки</h3>
                      <p className="text-[10px] text-gray-400">{startDate && endDate ? `${startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}</p>
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
                      <div className="p-3 sm:p-5 bg-white/50">
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        {/* Sales Sources Distribution */}
                        <div className="bg-white rounded-xl p-2 sm:p-3 shadow-sm">
                          <h4 className="text-[11px] sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Источники продаж</h4>
                          <ResponsiveContainer width="100%" height={110} className="sm:!h-[140px]">
                            <PieChart>
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
                          <div className="mt-1 sm:mt-2 space-y-0.5">
                            {salesSourcesData.map((item, index) => {
                              const total = salesSourcesData.reduce((sum, i) => sum + i.value, 0);
                              const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                              const revenuePercent = Number(percent) / 100;
                              const itemRevenue = Math.round(data.totalRevenue * revenuePercent);
                              return (
                                <div
                                  key={item.name}
                                  className="flex items-center gap-1 sm:gap-2 px-1 py-0.5 rounded hover:bg-gray-50"
                                >
                                  <div
                                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: SALES_SOURCE_COLORS[index] }}
                                  />
                                  <div className="flex-1 flex justify-between items-center min-w-0">
                                    <span className="text-[10px] sm:text-xs text-gray-700 truncate">{item.name}</span>
                                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-900 ml-1">{percent}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Delivery Mode */}
                        <div className="bg-white rounded-xl p-2 sm:p-3 shadow-sm">
                          <h4 className="text-[11px] sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Способы доставки</h4>
                          <ResponsiveContainer width="100%" height={110} className="sm:!h-[140px]">
                            <PieChart>
                              <Pie
                                data={deliveryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius="90%"
                                innerRadius="25%"
                                fill="#8884d8"
                                dataKey="value"
                                onClick={(segmentData) => {
                                  if (segmentData.name === 'Межгород') setShowCitiesDropdown(!showCitiesDropdown);
                                  else if (segmentData.name === 'Моя доставка') setShowMyDeliveryPopup(true);
                                  else if (segmentData.name === 'Экспресс доставка') setShowExpressPopup(true);
                                  else if (segmentData.name === 'Самовывоз') setShowPickupPopup(true);
                                  else if (segmentData.name === 'Оффлайн') setShowOfflineDeliveryPopup(true);
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                {deliveryData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={DELIVERY_COLORS[index % DELIVERY_COLORS.length]} style={{ cursor: 'pointer' }} />
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
                          <div className="mt-1 sm:mt-2 space-y-0.5">
                            {deliveryData.map((item, index) => {
                              const total = deliveryData.reduce((sum, i) => sum + i.value, 0);
                              const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                              const isIntercity = item.name === 'Межгород';

                              const handleItemClick = () => {
                                if (item.name === 'Межгород') setShowCitiesDropdown(!showCitiesDropdown);
                                else if (item.name === 'Моя доставка') setShowMyDeliveryPopup(true);
                                else if (item.name === 'Экспресс доставка') setShowExpressPopup(true);
                                else if (item.name === 'Самовывоз') setShowPickupPopup(true);
                                else if (item.name === 'Оффлайн') setShowOfflineDeliveryPopup(true);
                              };

                              return (
                                <div key={item.name}>
                                  <div
                                    className="flex items-center gap-1 sm:gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded transition-colors"
                                    onClick={handleItemClick}
                                  >
                                    <div
                                      className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: DELIVERY_COLORS[index] }}
                                    />
                                    <div className="flex-1 flex justify-between items-center min-w-0">
                                      <span className="text-[10px] sm:text-xs text-gray-700 truncate">{item.name}</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] sm:text-[11px] font-medium text-gray-900">{percent}%</span>
                                        <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 transition-transform ${isIntercity && showCitiesDropdown ? 'rotate-180' : ''}`} />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Выпадающий список городов для Межгород */}
                                  <AnimatePresence>
                                    {isIntercity && showCitiesDropdown && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden ml-3 sm:ml-4 border-l border-sky-200 pl-1.5 sm:pl-2"
                                      >
                                        {citiesData.map((city) => (
                                            <div
                                              key={city.name}
                                              className="flex items-center justify-between py-0.5 px-1 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCityPopup(city.name);
                                              }}
                                            >
                                              <span className="text-[9px] sm:text-[11px] text-gray-600 truncate">{city.name}</span>
                                              <div className="flex items-center gap-1 text-[9px] sm:text-[11px]">
                                                <span className="text-gray-900">{city.orders}</span>
                                                <ChevronRight className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-gray-400" />
                                              </div>
                                            </div>
                                          ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
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
              </motion.div>
            </motion.div>

          </>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-6"
          >
            {/* Метрики отзывов - горизонтальный скролл на мобильных */}
            <motion.div variants={itemVariants} className="mb-4 sm:mb-6">
              {(() => {
                // Вычисляем данные на основе периода
                const getDaysInPeriod = () => {
                  if (!startDate || !endDate) return 7;
                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                };

                const days = getDaysInPeriod();
                // Генерируем числа на основе периода (для демо)
                const basePositive = Math.round(days * 4.5);
                const baseNeutral = Math.round(days * 0.8);
                const baseNegative = Math.round(days * 0.4);
                const totalReviews = basePositive + baseNeutral + baseNegative;
                const avgRating = 4.5 + (days % 10) * 0.03;

                return (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        </div>
                        <span className="text-gray-600 text-xs sm:text-sm">Средний рейтинг</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-1.5">
                        {avgRating.toFixed(1)}
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${star <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] sm:text-xs text-emerald-500 mt-1">+0.2 vs прошлый период</div>
                    </div>

                    <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <span className="text-gray-600 text-xs sm:text-sm">Всего отзывов</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalReviews}</div>
                      <div className="text-[10px] sm:text-xs text-emerald-500 mt-1">+{Math.round(totalReviews * 0.12)} за период</div>
                    </div>

                    <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                          <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        </div>
                        <span className="text-gray-600 text-xs sm:text-sm">Положительные</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-emerald-600">{basePositive}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{Math.round((basePositive / totalReviews) * 100)}% от всех</div>
                    </div>

                    <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                        </div>
                        <span className="text-gray-600 text-xs sm:text-sm">За период</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-purple-600">{totalReviews}</div>
                      <div className="text-[10px] sm:text-xs text-emerald-500 mt-1">+{Math.round(totalReviews * 0.1)} vs прошлый</div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>

            {/* Блок сводки отзывов с графиком */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
              {(() => {
                // Генерируем данные на основе выбранного периода
                const generateReviewsDataForPeriod = () => {
                  if (!startDate || !endDate) return mockAnalyticsData.reviewsData.dailyReviews;

                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                  const data: { date: string; positive: number; neutral: number; negative: number }[] = [];

                  // Ограничиваем количество точек для читаемости
                  const maxPoints = 15;
                  const step = diffDays > maxPoints ? Math.ceil(diffDays / maxPoints) : 1;

                  for (let i = 0; i < diffDays; i += step) {
                    const currentDate = new Date(start);
                    currentDate.setDate(start.getDate() + i);

                    // Генерируем случайные данные на основе даты (для демо)
                    const seed = currentDate.getDate() + currentDate.getMonth() * 31;
                    const positive = 3 + (seed % 5);
                    const neutral = (seed % 3);
                    const negative = (seed % 2);

                    data.push({
                      date: `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
                      positive,
                      neutral,
                      negative
                    });
                  }

                  return data;
                };

                const reviewsData = generateReviewsDataForPeriod();
                const totalPositive = reviewsData.reduce((sum, d) => sum + d.positive, 0);
                const totalNeutral = reviewsData.reduce((sum, d) => sum + d.neutral, 0);
                const totalNegative = reviewsData.reduce((sum, d) => sum + d.negative, 0);
                const totalReviews = totalPositive + totalNeutral + totalNegative;

                // Данные для графика
                const positiveData = reviewsData.map(d => d.positive);
                const neutralData = reviewsData.map(d => d.neutral);
                const negativeData = reviewsData.map(d => d.negative);
                const allData = [...positiveData, ...neutralData, ...negativeData];
                const maxVal = Math.max(...allData, 1);
                // Широкий viewBox для правильных пропорций (3:1)
                const viewW = 300;
                const viewH = 100;
                const padX = 10;
                const padY = 15;
                const pointsCount = positiveData.length;

                const getY = (val: number) => {
                  const range = maxVal || 1;
                  const norm = val / range;
                  return padY + (1 - norm) * (viewH - padY * 2);
                };

                const getX = (i: number) => {
                  return padX + (i / Math.max(pointsCount - 1, 1)) * (viewW - padX * 2);
                };

                // Простая линия
                const generatePath = (data: number[]) => {
                  return data.map((val, i) => {
                    const x = getX(i);
                    const y = getY(val);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ');
                };

                return (
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Левая часть - статистика */}
                    <div className="lg:w-1/3">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                          <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Отзывы за период</p>
                          <p className="text-3xl font-bold text-gray-900">{totalReviews}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-sm text-gray-600">Положительные</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{totalPositive}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span className="text-sm text-gray-600">Хорошие</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{totalNeutral}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="text-sm text-gray-600">Отрицательные</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{totalNegative}</span>
                        </div>
                      </div>
                    </div>

                    {/* Правая часть - график */}
                    <div className="lg:w-2/3">
                      <p className="text-xs text-gray-400 mb-2">Динамика отзывов</p>
                      <div className="relative h-[120px] sm:h-[140px]">
                        <svg className="w-full h-full" viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="none">
                          {/* Горизонтальные линии */}
                          {[0, 0.5, 1].map((ratio, i) => (
                            <line
                              key={`grid-${i}`}
                              x1={padX}
                              y1={padY + ratio * (viewH - padY * 2)}
                              x2={viewW - padX}
                              y2={padY + ratio * (viewH - padY * 2)}
                              stroke="#f3f4f6"
                              strokeWidth="1"
                            />
                          ))}

                          {/* Линия положительных */}
                          <path
                            d={generatePath(positiveData)}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Линия хороших */}
                          <path
                            d={generatePath(neutralData)}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Линия отрицательных */}
                          <path
                            d={generatePath(negativeData)}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                        </svg>

                        {/* Точки на графике - HTML для интерактивности */}
                        {positiveData.map((val, i) => {
                          const xPercent = (getX(i) / viewW) * 100;
                          const yPercent = (getY(val) / viewH) * 100;
                          const isLast = i === pointsCount - 1;
                          const isSelected = selectedReviewDayIdx === i;
                          return (
                            <div key={`pos-${i}`}>
                              <div
                                className="absolute transition-all pointer-events-none"
                                style={{
                                  left: `${xPercent}%`,
                                  top: `${yPercent}%`,
                                  transform: 'translate(-50%, -50%)',
                                  width: isSelected ? 10 : isLast ? 8 : 5,
                                  height: isSelected ? 10 : isLast ? 8 : 5,
                                  borderRadius: '50%',
                                  backgroundColor: isSelected ? '#047857' : '#10b981',
                                }}
                              />
                              {isSelected && (
                                <div
                                  className="absolute pointer-events-none text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded"
                                  style={{
                                    left: `${xPercent}%`,
                                    top: `${yPercent - 12}%`,
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                >
                                  +{val}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {neutralData.map((val, i) => {
                          const xPercent = (getX(i) / viewW) * 100;
                          const yPercent = (getY(val) / viewH) * 100;
                          const isLast = i === pointsCount - 1;
                          const isSelected = selectedReviewDayIdx === i;
                          return (
                            <div key={`neut-${i}`}>
                              <div
                                className="absolute transition-all pointer-events-none"
                                style={{
                                  left: `${xPercent}%`,
                                  top: `${yPercent}%`,
                                  transform: 'translate(-50%, -50%)',
                                  width: isSelected ? 10 : isLast ? 8 : 5,
                                  height: isSelected ? 10 : isLast ? 8 : 5,
                                  borderRadius: '50%',
                                  backgroundColor: isSelected ? '#d97706' : '#f59e0b',
                                }}
                              />
                              {isSelected && (
                                <div
                                  className="absolute pointer-events-none text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded"
                                  style={{
                                    left: `${xPercent}%`,
                                    top: `${yPercent + 12}%`,
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                >
                                  {val}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {negativeData.map((val, i) => {
                          const xPercent = (getX(i) / viewW) * 100;
                          const yPercent = (getY(val) / viewH) * 100;
                          const isLast = i === pointsCount - 1;
                          const isSelected = selectedReviewDayIdx === i;
                          return (
                            <div key={`neg-${i}`}>
                              <div
                                className="absolute transition-all pointer-events-none"
                                style={{
                                  left: `${xPercent}%`,
                                  top: `${yPercent}%`,
                                  transform: 'translate(-50%, -50%)',
                                  width: isSelected ? 10 : isLast ? 8 : 5,
                                  height: isSelected ? 10 : isLast ? 8 : 5,
                                  borderRadius: '50%',
                                  backgroundColor: isSelected ? '#b91c1c' : '#ef4444',
                                }}
                              />
                              {isSelected && val > 0 && (
                                <div
                                  className="absolute pointer-events-none text-[9px] font-semibold text-red-700 bg-red-50 px-1 rounded"
                                  style={{
                                    left: `${xPercent}%`,
                                    top: `${yPercent + 20}%`,
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                >
                                  -{val}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Подписи дат - кликабельные */}
                      <div className="flex justify-between mt-1" style={{ paddingLeft: '3%', paddingRight: '3%' }}>
                        {reviewsData.map((day, idx) => {
                          const total = day.positive + day.neutral + day.negative;
                          const isLast = idx === reviewsData.length - 1;
                          const isSelected = selectedReviewDayIdx === idx;
                          // Показываем не все подписи если их много
                          const showLabel = reviewsData.length <= 10 || idx % Math.ceil(reviewsData.length / 10) === 0 || isLast;
                          if (!showLabel) return <div key={idx} className="w-0" />;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedReviewDayIdx(isSelected ? null : idx)}
                              className={`flex flex-col items-center py-1 px-1 rounded-lg transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-100 shadow-sm'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              <span className={`text-[9px] ${isSelected ? 'text-amber-700 font-semibold' : 'text-gray-600'}`}>{total}</span>
                              <span className={`text-[9px] ${isSelected ? 'text-amber-700 font-semibold' : isLast ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                                {day.date}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>

            {/* Распределение по рейтингу */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Распределение по рейтингу</h3>
              <div className="space-y-3">
                {mockAnalyticsData.reviewsData.ratingDistribution.map((item) => {
                  const percentage = (item.count / mockAnalyticsData.reviewsData.totalReviews) * 100;
                  return (
                    <div key={item.stars} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-20">
                        <span className="text-sm font-medium text-gray-700">{item.stars}</span>
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.stars >= 4 ? 'bg-emerald-500' :
                            item.stars === 3 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-sm font-medium text-gray-700">{item.count}</span>
                        <span className="text-xs text-gray-500 ml-1">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Список отзывов */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Последние отзывы</h3>
                <p className="text-sm text-gray-500 mt-1">Отзывы покупателей за выбранный период</p>
              </div>

              <div className="divide-y divide-gray-100">
                {mockAnalyticsData.reviewsData.recentReviews.map((review) => (
                  <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                          {review.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{review.customerName}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">{review.productName}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{review.date}</div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-14">
                      <p className="text-gray-700">{review.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button className="w-full py-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm cursor-pointer">
                  Показать все отзывы →
                </button>
              </div>
            </motion.div>

            {/* Топ товаров по отзывам */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm p-6 mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Топ товаров по отзывам</h3>
              <div className="space-y-4">
                {[
                  { name: 'iPhone 14 Pro 256GB', totalReviews: 48, avgRating: 4.9, positive: 46, neutral: 2, negative: 0 },
                  { name: 'Samsung Galaxy S23 Ultra', totalReviews: 35, avgRating: 4.7, positive: 31, neutral: 3, negative: 1 },
                  { name: 'AirPods Pro 2', totalReviews: 28, avgRating: 4.8, positive: 26, neutral: 2, negative: 0 },
                  { name: 'MacBook Pro 14" M2', totalReviews: 22, avgRating: 4.6, positive: 19, neutral: 2, negative: 1 },
                  { name: 'Apple Watch Ultra', totalReviews: 18, avgRating: 4.5, positive: 15, neutral: 2, negative: 1 },
                ].map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-600' :
                        index === 1 ? 'bg-gray-200 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{product.totalReviews} отзывов</span>
                          <span className="text-emerald-600">+{product.positive}</span>
                          {product.neutral > 0 && <span className="text-amber-600">~{product.neutral}</span>}
                          {product.negative > 0 && <span className="text-red-600">-{product.negative}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= Math.round(product.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-gray-900">{product.avgRating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Popup отзывов за день */}
        <AnimatePresence>
          {showReviewsDayPopup && selectedReviewsDay && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReviewsDayPopup(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />

              {/* Popup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[80vh] flex flex-col"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">Отзывы за {selectedReviewsDay}</h3>
                    <p className="text-amber-100 text-sm">
                      {(() => {
                        const dayData = mockAnalyticsData.reviewsData.dailyReviews.find(d => d.date === selectedReviewsDay);
                        const total = dayData ? dayData.positive + dayData.neutral + dayData.negative : 0;
                        return `Всего: ${total} отзыв(ов)`;
                      })()}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReviewsDayPopup(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors cursor-pointer"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Stats */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  {(() => {
                    const dayData = mockAnalyticsData.reviewsData.dailyReviews.find(d => d.date === selectedReviewsDay);
                    return (
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Положительные: <strong className="text-emerald-600">{dayData?.positive || 0}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Нейтральные: <strong className="text-amber-600">{dayData?.neutral || 0}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Негативные: <strong className="text-red-600">{dayData?.negative || 0}</strong></span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Reviews List */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    {mockAnalyticsData.reviewsData.recentReviews
                      .filter(review => {
                        // selectedReviewsDay формат: "07.01", review.date формат: "2026-01-07"
                        const [day, month] = selectedReviewsDay.split('.');
                        const reviewDate = new Date(review.date);
                        const reviewDay = String(reviewDate.getDate()).padStart(2, '0');
                        const reviewMonth = String(reviewDate.getMonth() + 1).padStart(2, '0');
                        return reviewDay === day && reviewMonth === month;
                      })
                      .map((review) => (
                        <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                              {review.customerName.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{review.customerName}</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 mb-2">{review.productName}</div>
                              <p className="text-gray-700">{review.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    {mockAnalyticsData.reviewsData.recentReviews.filter(review => {
                      const [day, month] = selectedReviewsDay.split('.');
                      const reviewDate = new Date(review.date);
                      const reviewDay = String(reviewDate.getDate()).padStart(2, '0');
                      const reviewMonth = String(reviewDate.getMonth() + 1).padStart(2, '0');
                      return reviewDay === day && reviewMonth === month;
                    }).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Нет отзывов за этот день</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowReviewsDayPopup(false)}
                    className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
                      {data.topProducts.slice(0, 3).map((product) => (
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

        {/* Cities Modal (Межгород) */}
        <AnimatePresence>
          {showCitiesModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCitiesModal(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-md overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Межгород</h2>
                      <p className="text-white/80 text-sm mt-1">Распределение по городам</p>
                    </div>
                    <button
                      onClick={() => setShowCitiesModal(false)}
                      className="text-white/80 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="space-y-3">
                    {citiesData.map((city, index) => {
                      const avgOrderValue = data.totalRevenue / data.totalOrders;
                      const cityRevenue = Math.round(city.orders * avgOrderValue);
                      return (
                        <div key={city.name} className="flex items-center gap-3">
                          <div className="w-6 text-center text-sm font-medium text-gray-400">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-gray-900">{city.name}</span>
                              <div className="text-right text-sm">
                                <span className="font-semibold text-gray-900">{city.orders} зак.</span>
                                <span className="text-gray-300 mx-1.5">•</span>
                                <span className="text-gray-600">{(cityRevenue / 1000).toFixed(0)}K ₸</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-purple-500 transition-all"
                                style={{ width: `${city.percent}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-gray-500 w-10 text-right">{city.percent}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Всего заказов межгород:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {data.deliveryModes.intercity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button
                    onClick={() => setShowCitiesModal(false)}
                    className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-sky-50 rounded-xl p-4 text-center">
                      <div className="text-sky-600 font-bold text-lg">{selectedTableDay.revenue.toLocaleString('ru-RU')} ₸</div>
                      <div className="text-gray-500 text-sm">Поступления</div>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-4 text-center">
                      <div className="text-rose-500 font-bold text-lg">{(selectedTableDay.totalExpenses || 0).toLocaleString('ru-RU')} ₸</div>
                      <div className="text-gray-500 text-sm">Расходы</div>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-4 text-center">
                      <div className="text-teal-600 font-bold text-lg">{selectedTableDay.profit.toLocaleString('ru-RU')} ₸</div>
                      <div className="text-gray-500 text-sm">Прибыль</div>
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
                      <div className="flex justify-between items-center py-2 bg-rose-50 -mx-2 px-2 rounded-lg">
                        <span className="font-semibold text-gray-900">Итого расходов</span>
                        <span className="font-bold text-rose-500">
                          {(data.totalCost + data.totalAdvertising + data.totalCommissions + data.totalTax + data.totalDelivery).toLocaleString('ru-RU')} ₸
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Топ товаров</h3>
                    <div className="space-y-2">
                      {data.topProducts.slice(0, 3).map((product, i) => (
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
                      <div className="text-blue-600 font-bold text-xl">{Math.round(data.totalRevenue * 0.6 / 1000)}K ₸</div>
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
                      <div className="text-orange-600 font-bold text-xl">{Math.round(data.totalRevenue * 0.4 / 1000)}K ₸</div>
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

        {/* Offline Source Popup */}
        <AnimatePresence>
          {showOfflineSourcePopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOfflineSourcePopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Оффлайн</h2>
                      <p className="text-white/80 text-sm mt-1">Заказы, добавленные вручную</p>
                    </div>
                    <button onClick={() => setShowOfflineSourcePopup(false)} className="text-white/80 hover:text-white text-2xl">×</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                      <div className="text-gray-700 font-bold text-xl">{offlineOrders}</div>
                      <div className="text-gray-500 text-sm">Заказов</div>
                    </div>
                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                      <div className="text-gray-700 font-bold text-xl">{Math.round(data.totalRevenue * 0.05 / 1000)}K ₸</div>
                      <div className="text-gray-500 text-sm">Выручка</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Заказы</h3>
                    <div className="space-y-2">
                      {Array.from({ length: offlineOrders }).map((_, i) => {
                        const product = data.topProducts[i % data.topProducts.length];
                        const orderAmount = Math.round((data.totalRevenue * 0.05) / offlineOrders * (0.8 + (i * 0.05)));
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-medium text-gray-900">Заказ #{300000 + i * 3}</div>
                              <div className="text-sm text-gray-600 truncate">{product.name}</div>
                              <div className="text-xs text-gray-400">Ручной ввод</div>
                            </div>
                            <div className="font-semibold text-gray-900">{orderAmount.toLocaleString('ru-RU')} ₸</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button onClick={() => setShowOfflineSourcePopup(false)} className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium">Закрыть</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* My Delivery Popup */}
        <AnimatePresence>
          {showMyDeliveryPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMyDeliveryPopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Моя доставка</h2>
                      <p className="text-white/80 text-sm mt-1">Заказы с курьерской доставкой</p>
                    </div>
                    <button onClick={() => setShowMyDeliveryPopup(false)} className="text-white/80 hover:text-white text-2xl">×</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-pink-50 rounded-xl p-4 text-center">
                      <div className="text-pink-600 font-bold text-xl">{data.deliveryModes.myDelivery}</div>
                      <div className="text-gray-500 text-sm">Заказов</div>
                    </div>
                    <div className="bg-pink-50 rounded-xl p-4 text-center">
                      <div className="text-pink-600 font-bold text-xl">{Math.round(data.totalRevenue * 0.42 / 1000)}K ₸</div>
                      <div className="text-gray-500 text-sm">Выручка</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Заказы</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Array.from({ length: Math.min(data.deliveryModes.myDelivery, 8) }).map((_, i) => {
                        const product = data.topProducts[i % data.topProducts.length];
                        const orderAmount = Math.round((data.totalRevenue * 0.42) / data.deliveryModes.myDelivery * (0.8 + (i * 0.05)));
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-medium text-gray-900">Заказ #{400000 + i * 5}</div>
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
                  <button onClick={() => setShowMyDeliveryPopup(false)} className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-medium">Закрыть</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Express Delivery Popup */}
        <AnimatePresence>
          {showExpressPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowExpressPopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Экспресс доставка</h2>
                      <p className="text-white/80 text-sm mt-1">Срочная доставка</p>
                    </div>
                    <button onClick={() => setShowExpressPopup(false)} className="text-white/80 hover:text-white text-2xl">×</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-teal-50 rounded-xl p-4 text-center">
                      <div className="text-teal-600 font-bold text-xl">{data.deliveryModes.expressDelivery}</div>
                      <div className="text-gray-500 text-sm">Заказов</div>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-4 text-center">
                      <div className="text-teal-600 font-bold text-xl">{Math.round(data.totalRevenue * 0.17 / 1000)}K ₸</div>
                      <div className="text-gray-500 text-sm">Выручка</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Заказы</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Array.from({ length: Math.min(data.deliveryModes.expressDelivery, 8) }).map((_, i) => {
                        const product = data.topProducts[i % data.topProducts.length];
                        const orderAmount = Math.round((data.totalRevenue * 0.17) / data.deliveryModes.expressDelivery * (0.8 + (i * 0.05)));
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-medium text-gray-900">Заказ #{500000 + i * 9}</div>
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
                  <button onClick={() => setShowExpressPopup(false)} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium">Закрыть</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Pickup Popup */}
        <AnimatePresence>
          {showPickupPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPickupPopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Самовывоз</h2>
                      <p className="text-white/80 text-sm mt-1">Заказы с самовывозом</p>
                    </div>
                    <button onClick={() => setShowPickupPopup(false)} className="text-white/80 hover:text-white text-2xl">×</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <div className="text-amber-600 font-bold text-xl">{data.deliveryModes.pickup}</div>
                      <div className="text-gray-500 text-sm">Заказов</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <div className="text-amber-600 font-bold text-xl">{Math.round(data.totalRevenue * 0.16 / 1000)}K ₸</div>
                      <div className="text-gray-500 text-sm">Выручка</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Заказы</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Array.from({ length: Math.min(data.deliveryModes.pickup, 8) }).map((_, i) => {
                        const product = data.topProducts[i % data.topProducts.length];
                        const orderAmount = Math.round((data.totalRevenue * 0.16) / data.deliveryModes.pickup * (0.8 + (i * 0.05)));
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-medium text-gray-900">Заказ #{600000 + i * 13}</div>
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
                  <button onClick={() => setShowPickupPopup(false)} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium">Закрыть</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Offline Delivery Popup */}
        <AnimatePresence>
          {showOfflineDeliveryPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOfflineDeliveryPopup(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Оффлайн</h2>
                      <p className="text-white/80 text-sm mt-1">Ручные заказы</p>
                    </div>
                    <button onClick={() => setShowOfflineDeliveryPopup(false)} className="text-white/80 hover:text-white text-2xl">×</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                      <div className="text-gray-700 font-bold text-xl">{offlineOrders}</div>
                      <div className="text-gray-500 text-sm">Заказов</div>
                    </div>
                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                      <div className="text-gray-700 font-bold text-xl">{Math.round(data.totalRevenue * 0.05 / 1000)}K ₸</div>
                      <div className="text-gray-500 text-sm">Выручка</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Заказы</h3>
                    <div className="space-y-2">
                      {Array.from({ length: offlineOrders }).map((_, i) => {
                        const product = data.topProducts[i % data.topProducts.length];
                        const orderAmount = Math.round((data.totalRevenue * 0.05) / offlineOrders * (0.8 + (i * 0.05)));
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-medium text-gray-900">Заказ #{700000 + i * 17}</div>
                              <div className="text-sm text-gray-600 truncate">{product.name}</div>
                              <div className="text-xs text-gray-400">Ручной ввод</div>
                            </div>
                            <div className="font-semibold text-gray-900">{orderAmount.toLocaleString('ru-RU')} ₸</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button onClick={() => setShowOfflineDeliveryPopup(false)} className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium">Закрыть</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* City Orders Popup */}
        <AnimatePresence>
          {selectedCityPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedCityPopup(null)}
                className="fixed inset-0 bg-black/50 z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedCityPopup}</h2>
                      <p className="text-white/80 text-sm mt-1">Заказы в город</p>
                    </div>
                    <button onClick={() => setSelectedCityPopup(null)} className="text-white/80 hover:text-white text-2xl">×</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {(() => {
                    const cityData = citiesData.find(c => c.name === selectedCityPopup);
                    const cityOrders = cityData?.orders || 1;
                    const avgOrderValue = data.totalRevenue / data.totalOrders;
                    const cityRevenue = Math.round(cityOrders * avgOrderValue);
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-purple-50 rounded-xl p-4 text-center">
                            <div className="text-purple-600 font-bold text-xl">{cityOrders}</div>
                            <div className="text-gray-500 text-sm">Заказов</div>
                          </div>
                          <div className="bg-purple-50 rounded-xl p-4 text-center">
                            <div className="text-purple-600 font-bold text-xl">{Math.round(cityRevenue / 1000)}K ₸</div>
                            <div className="text-gray-500 text-sm">Выручка</div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Заказы</h3>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {Array.from({ length: Math.min(cityOrders, 8) }).map((_, i) => {
                              const product = data.topProducts[i % data.topProducts.length];
                              const orderAmount = Math.round(avgOrderValue * (0.8 + (i * 0.05)));
                              return (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex-1 min-w-0 pr-3">
                                    <div className="font-medium text-gray-900">Заказ #{800000 + i * 7}</div>
                                    <div className="text-sm text-gray-600 truncate">{product.name}</div>
                                    <div className="text-xs text-purple-500">📍 {selectedCityPopup}</div>
                                  </div>
                                  <div className="font-semibold text-gray-900">{orderAmount.toLocaleString('ru-RU')} ₸</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="bg-gray-50 p-4 flex justify-end">
                  <button onClick={() => setSelectedCityPopup(null)} className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium">Закрыть</button>
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

                {/* Period Selector */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex gap-2">
                    {[
                      { key: 'week', label: 'Неделя' },
                      { key: 'month', label: 'Месяц' },
                      { key: '3months', label: '3 месяца' }
                    ].map((period) => (
                      <button
                        key={period.key}
                        onClick={() => setProductPopupPeriod(period.key as 'week' | 'month' | '3months')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          productPopupPeriod === period.key
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Продажи */}
                  {(() => {
                    const multiplier = productPopupPeriod === 'week' ? 1 : productPopupPeriod === 'month' ? 4 : 12;
                    const sales = selectedProduct.sales * multiplier;
                    const revenue = selectedProduct.revenue * multiplier;
                    const cost = selectedProduct.cost * multiplier;
                    const profit = selectedProduct.profit * multiplier;

                    // Расчёт детальных расходов
                    const taxRate = 0.03; // 3% налоги
                    const kaspiCommission = 0.08; // 8% комиссия Kaspi
                    const deliveryCost = 1500 * sales; // 1500 ₸ за доставку
                    const advertisingCost = Math.round(revenue * 0.05); // 5% реклама

                    const taxes = Math.round(revenue * taxRate);
                    const commission = Math.round(revenue * kaspiCommission);
                    const productCost = cost - deliveryCost - advertisingCost; // Себестоимость
                    const netProfit = revenue - productCost - taxes - commission - deliveryCost - advertisingCost;

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
                              <span className="font-medium text-gray-900">{productCost.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Налоги (3%)</span>
                              <span className="font-medium text-red-600">−{taxes.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Комиссия Kaspi (8%)</span>
                              <span className="font-medium text-red-600">−{commission.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Доставка</span>
                              <span className="font-medium text-red-600">−{deliveryCost.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                              <span className="text-gray-600 text-sm">Реклама</span>
                              <span className="font-medium text-red-600">−{advertisingCost.toLocaleString('ru-RU')} ₸</span>
                            </div>
                          </div>
                        </div>

                        {/* Итого */}
                        <div className="bg-emerald-50 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-emerald-700 text-sm">Чистая прибыль</div>
                              <div className="text-xs text-emerald-600/70">
                                Маржа: {((netProfit / revenue) * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-2xl font-bold text-emerald-700">
                              {netProfit.toLocaleString('ru-RU')} ₸
                            </div>
                          </div>
                        </div>

                        {/* Сравнение с предыдущим периодом */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Сравнение с прошлым периодом</h3>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <div className="text-emerald-600 font-semibold">+12%</div>
                              <div className="text-xs text-gray-500">Продажи</div>
                            </div>
                            <div>
                              <div className="text-emerald-600 font-semibold">+8%</div>
                              <div className="text-xs text-gray-500">Выручка</div>
                            </div>
                            <div>
                              <div className="text-emerald-600 font-semibold">+15%</div>
                              <div className="text-xs text-gray-500">Прибыль</div>
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
                        {((data.pendingOrders?.totalAmount || 0) / 1000000).toFixed(1)}M ₸
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
                          <div className="font-semibold text-gray-900 text-sm">{(order.amount / 1000).toFixed(0)}K ₸</div>
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
                        {(calculateMonthlyOperationalExpenses() / 1000).toFixed(0)}K ₸
                      </div>
                      <div className="text-xs sm:text-sm text-indigo-600">Всего расходов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-indigo-700">
                        {(calculateAverageDailyExpenses() / 1000).toFixed(1)}K ₸
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
                            <div className="font-medium text-gray-900 text-sm">{expense.name}</div>
                            <div className="flex items-center gap-2">
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
                              {(dailyAmount / 1000).toFixed(1)}K ₸/день
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
                      {/* Period Selection */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExpenseCalendar(!showExpenseCalendar)}
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
                          ≈ {((parseFloat(newExpenseAmount) / (Math.ceil((newExpenseEndDate.getTime() - newExpenseStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)) / 1000).toFixed(1)}K ₸ в день
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
