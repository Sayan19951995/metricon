'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, DollarSign, TrendingUp, Calculator, Calendar, ChevronDown, ChevronRight, Package, CheckCircle, AlertTriangle, XCircle, Truck, Star, MessageCircle, ThumbsUp, Megaphone } from 'lucide-react';
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
    count: 12,           // Количество заказов в пути
    totalAmount: 186500, // Сумма ожидаемых поступлений
    orders: [
      { id: 'ORD-2026-001', product: 'iPhone 14 Pro 256GB', amount: 449900, date: '2026-01-17', customer: 'Астана' },
      { id: 'ORD-2026-002', product: 'Samsung Galaxy S23 Ultra', amount: 389900, date: '2026-01-17', customer: 'Алматы' },
      { id: 'ORD-2026-003', product: 'AirPods Pro 2', amount: 89900, date: '2026-01-18', customer: 'Караганда' },
      { id: 'ORD-2026-004', product: 'MacBook Pro 14"', amount: 849900, date: '2026-01-18', customer: 'Шымкент' },
      { id: 'ORD-2026-005', product: 'Apple Watch Ultra', amount: 379900, date: '2026-01-18', customer: 'Алматы' },
      { id: 'ORD-2026-006', product: 'iPad Air 5th Gen', amount: 289900, date: '2026-01-19', customer: 'Астана' },
      { id: 'ORD-2026-007', product: 'Sony WH-1000XM5', amount: 149900, date: '2026-01-19', customer: 'Актобе' },
      { id: 'ORD-2026-008', product: 'iPhone 14 Pro 256GB', amount: 449900, date: '2026-01-19', customer: 'Алматы' },
      { id: 'ORD-2026-009', product: 'Samsung Galaxy Tab S9', amount: 329900, date: '2026-01-19', customer: 'Павлодар' },
      { id: 'ORD-2026-010', product: 'AirPods Pro 2', amount: 89900, date: '2026-01-19', customer: 'Алматы' },
      { id: 'ORD-2026-011', product: 'Google Pixel 8 Pro', amount: 349900, date: '2026-01-19', customer: 'Астана' },
      { id: 'ORD-2026-012', product: 'Nintendo Switch OLED', amount: 159900, date: '2026-01-19', customer: 'Караганда' },
    ]
  },

  dailyData: [
    { date: '01.10', fullDate: new Date('2025-10-01'), day: 'Ср', orders: 6, revenue: 91278, cost: 58278, advertising: 3505, commissions: 7302, tax: 3651, delivery: 1369, profit: 17173 },
    { date: '02.10', fullDate: new Date('2025-10-02'), day: 'Чт', orders: 10, revenue: 132060, cost: 76275, advertising: 5831, commissions: 10564, tax: 5282, delivery: 1980, profit: 32128 },
    { date: '03.10', fullDate: new Date('2025-10-03'), day: 'Пт', orders: 5, revenue: 67450, cost: 38207, advertising: 2240, commissions: 5396, tax: 2698, delivery: 1011, profit: 17898 },
    { date: '04.10', fullDate: new Date('2025-10-04'), day: 'Сб', orders: 6, revenue: 85620, cost: 51473, advertising: 2777, commissions: 6849, tax: 3424, delivery: 1284, profit: 19813 },
    { date: '05.10', fullDate: new Date('2025-10-05'), day: 'Вс', orders: 4, revenue: 49920, cost: 31103, advertising: 1514, commissions: 3993, tax: 1996, delivery: 748, profit: 10566 },
    { date: '06.10', fullDate: new Date('2025-10-06'), day: 'Пн', orders: 9, revenue: 147069, cost: 88130, advertising: 4578, commissions: 11765, tax: 5882, delivery: 2206, profit: 34508 },
    { date: '07.10', fullDate: new Date('2025-10-07'), day: 'Вт', orders: 8, revenue: 115664, cost: 72093, advertising: 4472, commissions: 9253, tax: 4626, delivery: 1734, profit: 23486 },
    { date: '08.10', fullDate: new Date('2025-10-08'), day: 'Ср', orders: 5, revenue: 65565, cost: 41231, advertising: 2588, commissions: 5245, tax: 2622, delivery: 983, profit: 12896 },
    { date: '09.10', fullDate: new Date('2025-10-09'), day: 'Чт', orders: 9, revenue: 152496, cost: 93974, advertising: 8329, commissions: 12199, tax: 6099, delivery: 2287, profit: 29608 },
    { date: '10.10', fullDate: new Date('2025-10-10'), day: 'Пт', orders: 5, revenue: 76785, cost: 46470, advertising: 3406, commissions: 6142, tax: 3071, delivery: 1151, profit: 16545 },
    { date: '11.10', fullDate: new Date('2025-10-11'), day: 'Сб', orders: 3, revenue: 45975, cost: 28189, advertising: 2249, commissions: 3678, tax: 1839, delivery: 689, profit: 9331 },
    { date: '12.10', fullDate: new Date('2025-10-12'), day: 'Вс', orders: 5, revenue: 67760, cost: 43751, advertising: 3117, commissions: 5420, tax: 2710, delivery: 1016, profit: 11746 },
    { date: '13.10', fullDate: new Date('2025-10-13'), day: 'Пн', orders: 5, revenue: 66310, cost: 41138, advertising: 3737, commissions: 5304, tax: 2652, delivery: 994, profit: 12485 },
    { date: '14.10', fullDate: new Date('2025-10-14'), day: 'Вт', orders: 5, revenue: 70570, cost: 38820, advertising: 2361, commissions: 5645, tax: 2822, delivery: 1058, profit: 19864 },
    { date: '15.10', fullDate: new Date('2025-10-15'), day: 'Ср', orders: 7, revenue: 113099, cost: 67726, advertising: 3890, commissions: 9047, tax: 4523, delivery: 1696, profit: 26217 },
    { date: '16.10', fullDate: new Date('2025-10-16'), day: 'Чт', orders: 7, revenue: 103250, cost: 61418, advertising: 4844, commissions: 8260, tax: 4130, delivery: 1548, profit: 23050 },
    { date: '17.10', fullDate: new Date('2025-10-17'), day: 'Пт', orders: 6, revenue: 78384, cost: 45095, advertising: 4370, commissions: 6270, tax: 3135, delivery: 1175, profit: 18339 },
    { date: '18.10', fullDate: new Date('2025-10-18'), day: 'Сб', orders: 4, revenue: 63096, cost: 35166, advertising: 2737, commissions: 5047, tax: 2523, delivery: 946, profit: 16677 },
    { date: '19.10', fullDate: new Date('2025-10-19'), day: 'Вс', orders: 4, revenue: 64592, cost: 38317, advertising: 3512, commissions: 5167, tax: 2583, delivery: 968, profit: 14045 },
    { date: '20.10', fullDate: new Date('2025-10-20'), day: 'Пн', orders: 6, revenue: 74808, cost: 46152, advertising: 4027, commissions: 5984, tax: 2992, delivery: 1122, profit: 14531 },
    { date: '21.10', fullDate: new Date('2025-10-21'), day: 'Вт', orders: 5, revenue: 75855, cost: 47744, advertising: 3459, commissions: 6068, tax: 3034, delivery: 1137, profit: 14413 },
    { date: '22.10', fullDate: new Date('2025-10-22'), day: 'Ср', orders: 5, revenue: 84115, cost: 53861, advertising: 4119, commissions: 6729, tax: 3364, delivery: 1261, profit: 14781 },
    { date: '23.10', fullDate: new Date('2025-10-23'), day: 'Чт', orders: 5, revenue: 65925, cost: 39233, advertising: 3635, commissions: 5274, tax: 2637, delivery: 988, profit: 14158 },
    { date: '24.10', fullDate: new Date('2025-10-24'), day: 'Пт', orders: 8, revenue: 133448, cost: 75156, advertising: 4996, commissions: 10675, tax: 5337, delivery: 2001, profit: 35283 },
    { date: '25.10', fullDate: new Date('2025-10-25'), day: 'Сб', orders: 6, revenue: 95436, cost: 57446, advertising: 3161, commissions: 7634, tax: 3817, delivery: 1431, profit: 21947 },
    { date: '26.10', fullDate: new Date('2025-10-26'), day: 'Вс', orders: 6, revenue: 74940, cost: 48275, advertising: 3696, commissions: 5995, tax: 2997, delivery: 1124, profit: 12853 },
    { date: '27.10', fullDate: new Date('2025-10-27'), day: 'Пн', orders: 9, revenue: 139311, cost: 88917, advertising: 4191, commissions: 11144, tax: 5572, delivery: 2089, profit: 27398 },
    { date: '28.10', fullDate: new Date('2025-10-28'), day: 'Вт', orders: 6, revenue: 92478, cost: 56883, advertising: 5439, commissions: 7398, tax: 3699, delivery: 1387, profit: 17672 },
    { date: '29.10', fullDate: new Date('2025-10-29'), day: 'Ср', orders: 5, revenue: 60400, cost: 38397, advertising: 2185, commissions: 4832, tax: 2416, delivery: 906, profit: 11664 },
    { date: '30.10', fullDate: new Date('2025-10-30'), day: 'Чт', orders: 9, revenue: 145890, cost: 86015, advertising: 5312, commissions: 11671, tax: 5835, delivery: 2188, profit: 34869 },
    { date: '31.10', fullDate: new Date('2025-10-31'), day: 'Пт', orders: 10, revenue: 131050, cost: 72753, advertising: 6968, commissions: 10484, tax: 5242, delivery: 1965, profit: 33638 },
    { date: '01.11', fullDate: new Date('2025-11-01'), day: 'Сб', orders: 4, revenue: 60416, cost: 35771, advertising: 2624, commissions: 4833, tax: 2416, delivery: 906, profit: 13866 },
    { date: '02.11', fullDate: new Date('2025-11-02'), day: 'Вс', orders: 5, revenue: 80490, cost: 50194, advertising: 2748, commissions: 6439, tax: 3219, delivery: 1207, profit: 16683 },
    { date: '03.11', fullDate: new Date('2025-11-03'), day: 'Пн', orders: 10, revenue: 150750, cost: 92943, advertising: 5837, commissions: 12060, tax: 6030, delivery: 2261, profit: 31619 },
    { date: '04.11', fullDate: new Date('2025-11-04'), day: 'Вт', orders: 6, revenue: 81120, cost: 48515, advertising: 4359, commissions: 6489, tax: 3244, delivery: 1216, profit: 17297 },
    { date: '05.11', fullDate: new Date('2025-11-05'), day: 'Ср', orders: 6, revenue: 91728, cost: 57025, advertising: 3228, commissions: 7338, tax: 3669, delivery: 1375, profit: 19093 },
    { date: '06.11', fullDate: new Date('2025-11-06'), day: 'Чт', orders: 6, revenue: 74478, cost: 47314, advertising: 2757, commissions: 5958, tax: 2979, delivery: 1117, profit: 14353 },
    { date: '07.11', fullDate: new Date('2025-11-07'), day: 'Пт', orders: 5, revenue: 61735, cost: 39694, advertising: 3090, commissions: 4938, tax: 2469, delivery: 926, profit: 10618 },
    { date: '08.11', fullDate: new Date('2025-11-08'), day: 'Сб', orders: 6, revenue: 73692, cost: 43183, advertising: 2791, commissions: 5895, tax: 2947, delivery: 1105, profit: 17771 },
    { date: '09.11', fullDate: new Date('2025-11-09'), day: 'Вс', orders: 3, revenue: 45735, cost: 25233, advertising: 2386, commissions: 3658, tax: 1829, delivery: 686, profit: 11943 },
    { date: '10.11', fullDate: new Date('2025-11-10'), day: 'Пн', orders: 7, revenue: 116809, cost: 73580, advertising: 3929, commissions: 9344, tax: 4672, delivery: 1752, profit: 23532 },
    { date: '11.11', fullDate: new Date('2025-11-11'), day: 'Вт', orders: 10, revenue: 134060, cost: 81433, advertising: 7655, commissions: 10724, tax: 5362, delivery: 2010, profit: 26876 },
    { date: '12.11', fullDate: new Date('2025-11-12'), day: 'Ср', orders: 6, revenue: 87864, cost: 53822, advertising: 3628, commissions: 7029, tax: 3514, delivery: 1317, profit: 18554 },
    { date: '13.11', fullDate: new Date('2025-11-13'), day: 'Чт', orders: 10, revenue: 167210, cost: 97354, advertising: 8112, commissions: 13376, tax: 6688, delivery: 2508, profit: 39172 },
    { date: '14.11', fullDate: new Date('2025-11-14'), day: 'Пт', orders: 8, revenue: 124808, cost: 73253, advertising: 6948, commissions: 9984, tax: 4992, delivery: 1872, profit: 27759 },
    { date: '15.11', fullDate: new Date('2025-11-15'), day: 'Сб', orders: 3, revenue: 38886, cost: 23735, advertising: 1623, commissions: 3110, tax: 1555, delivery: 583, profit: 8280 },
    { date: '16.11', fullDate: new Date('2025-11-16'), day: 'Вс', orders: 6, revenue: 82854, cost: 53455, advertising: 3505, commissions: 6628, tax: 3314, delivery: 1242, profit: 14710 },
    { date: '17.11', fullDate: new Date('2025-11-17'), day: 'Пн', orders: 9, revenue: 136602, cost: 75152, advertising: 8131, commissions: 10928, tax: 5464, delivery: 2049, profit: 34878 },
    { date: '18.11', fullDate: new Date('2025-11-18'), day: 'Вт', orders: 5, revenue: 74105, cost: 45760, advertising: 3211, commissions: 5928, tax: 2964, delivery: 1111, profit: 15131 },
    { date: '19.11', fullDate: new Date('2025-11-19'), day: 'Ср', orders: 8, revenue: 131664, cost: 72970, advertising: 6941, commissions: 10533, tax: 5266, delivery: 1974, profit: 33980 },
    { date: '20.11', fullDate: new Date('2025-11-20'), day: 'Чт', orders: 9, revenue: 115281, cost: 69333, advertising: 6805, commissions: 9222, tax: 4611, delivery: 1729, profit: 23581 },
    { date: '21.11', fullDate: new Date('2025-11-21'), day: 'Пт', orders: 7, revenue: 86366, cost: 54745, advertising: 3400, commissions: 6909, tax: 3454, delivery: 1295, profit: 16563 },
    { date: '22.11', fullDate: new Date('2025-11-22'), day: 'Сб', orders: 3, revenue: 40794, cost: 24335, advertising: 1340, commissions: 3263, tax: 1631, delivery: 611, profit: 9614 },
    { date: '23.11', fullDate: new Date('2025-11-23'), day: 'Вс', orders: 6, revenue: 101592, cost: 61070, advertising: 4177, commissions: 8127, tax: 4063, delivery: 1523, profit: 22632 },
    { date: '24.11', fullDate: new Date('2025-11-24'), day: 'Пн', orders: 7, revenue: 110117, cost: 67299, advertising: 3672, commissions: 8809, tax: 4404, delivery: 1651, profit: 24282 },
    { date: '25.11', fullDate: new Date('2025-11-25'), day: 'Вт', orders: 10, revenue: 167580, cost: 108180, advertising: 8882, commissions: 13406, tax: 6703, delivery: 2513, profit: 27896 },
    { date: '26.11', fullDate: new Date('2025-11-26'), day: 'Ср', orders: 6, revenue: 79506, cost: 47465, advertising: 2601, commissions: 6360, tax: 3180, delivery: 1192, profit: 18708 },
    { date: '27.11', fullDate: new Date('2025-11-27'), day: 'Чт', orders: 9, revenue: 127899, cost: 78904, advertising: 6550, commissions: 10231, tax: 5115, delivery: 1918, profit: 25181 },
    { date: '28.11', fullDate: new Date('2025-11-28'), day: 'Пт', orders: 7, revenue: 97111, cost: 57030, advertising: 5035, commissions: 7768, tax: 3884, delivery: 1456, profit: 21938 },
    { date: '29.11', fullDate: new Date('2025-11-29'), day: 'Сб', orders: 6, revenue: 84504, cost: 51225, advertising: 4126, commissions: 6760, tax: 3380, delivery: 1267, profit: 17746 },
    { date: '30.11', fullDate: new Date('2025-11-30'), day: 'Вс', orders: 3, revenue: 50205, cost: 28213, advertising: 1791, commissions: 4016, tax: 2008, delivery: 753, profit: 13424 },
    { date: '01.12', fullDate: new Date('2025-12-01'), day: 'Пн', orders: 9, revenue: 138771, cost: 88241, advertising: 5418, commissions: 11101, tax: 5550, delivery: 2081, profit: 26380 },
    { date: '02.12', fullDate: new Date('2025-12-02'), day: 'Вт', orders: 10, revenue: 127980, cost: 74104, advertising: 5497, commissions: 10238, tax: 5119, delivery: 1919, profit: 31103 },
    { date: '03.12', fullDate: new Date('2025-12-03'), day: 'Ср', orders: 9, revenue: 116829, cost: 66045, advertising: 5131, commissions: 9346, tax: 4673, delivery: 1752, profit: 29882 },
    { date: '04.12', fullDate: new Date('2025-12-04'), day: 'Чт', orders: 6, revenue: 87210, cost: 55842, advertising: 2708, commissions: 6976, tax: 3488, delivery: 1308, profit: 16888 },
    { date: '05.12', fullDate: new Date('2025-12-05'), day: 'Пт', orders: 8, revenue: 111640, cost: 70341, advertising: 3735, commissions: 8931, tax: 4465, delivery: 1674, profit: 22494 },
    { date: '06.12', fullDate: new Date('2025-12-06'), day: 'Сб', orders: 3, revenue: 36954, cost: 21419, advertising: 1615, commissions: 2956, tax: 1478, delivery: 554, profit: 8932 },
    { date: '07.12', fullDate: new Date('2025-12-07'), day: 'Вс', orders: 5, revenue: 65615, cost: 39496, advertising: 2332, commissions: 5249, tax: 2624, delivery: 984, profit: 14930 },
    { date: '08.12', fullDate: new Date('2025-12-08'), day: 'Пн', orders: 8, revenue: 123544, cost: 69526, advertising: 6623, commissions: 9883, tax: 4941, delivery: 1853, profit: 30718 },
    { date: '09.12', fullDate: new Date('2025-12-09'), day: 'Вт', orders: 9, revenue: 139068, cost: 88799, advertising: 6569, commissions: 11125, tax: 5562, delivery: 2086, profit: 24927 },
    { date: '10.12', fullDate: new Date('2025-12-10'), day: 'Ср', orders: 5, revenue: 71440, cost: 42165, advertising: 2402, commissions: 5715, tax: 2857, delivery: 1071, profit: 17230 },
    { date: '11.12', fullDate: new Date('2025-12-11'), day: 'Чт', orders: 7, revenue: 104720, cost: 59344, advertising: 6159, commissions: 8377, tax: 4188, delivery: 1570, profit: 25082 },
    { date: '12.12', fullDate: new Date('2025-12-12'), day: 'Пт', orders: 10, revenue: 122070, cost: 78024, advertising: 4784, commissions: 9765, tax: 4882, delivery: 1831, profit: 22784 },
    { date: '13.12', fullDate: new Date('2025-12-13'), day: 'Сб', orders: 6, revenue: 78828, cost: 50308, advertising: 3364, commissions: 6306, tax: 3153, delivery: 1182, profit: 14515 },
    { date: '14.12', fullDate: new Date('2025-12-14'), day: 'Вс', orders: 5, revenue: 79225, cost: 50933, advertising: 2875, commissions: 6338, tax: 3169, delivery: 1188, profit: 14722 },
    { date: '15.12', fullDate: new Date('2025-12-15'), day: 'Пн', orders: 8, revenue: 107728, cost: 60511, advertising: 3531, commissions: 8618, tax: 4309, delivery: 1615, profit: 29144 },
    { date: '16.12', fullDate: new Date('2025-12-16'), day: 'Вт', orders: 7, revenue: 117166, cost: 70135, advertising: 6361, commissions: 9373, tax: 4686, delivery: 1757, profit: 24854 },
    { date: '17.12', fullDate: new Date('2025-12-17'), day: 'Ср', orders: 10, revenue: 138090, cost: 89580, advertising: 8046, commissions: 11047, tax: 5523, delivery: 2071, profit: 21823 },
    { date: '18.12', fullDate: new Date('2025-12-18'), day: 'Чт', orders: 10, revenue: 147400, cost: 90417, advertising: 7226, commissions: 11792, tax: 5896, delivery: 2211, profit: 29858 },
    { date: '19.12', fullDate: new Date('2025-12-19'), day: 'Пт', orders: 9, revenue: 133614, cost: 76055, advertising: 5995, commissions: 10689, tax: 5344, delivery: 2004, profit: 33527 },
    { date: '20.12', fullDate: new Date('2025-12-20'), day: 'Сб', orders: 5, revenue: 82255, cost: 49404, advertising: 3357, commissions: 6580, tax: 3290, delivery: 1233, profit: 18391 },
    { date: '21.12', fullDate: new Date('2025-12-21'), day: 'Вс', orders: 6, revenue: 91464, cost: 53918, advertising: 3165, commissions: 7317, tax: 3658, delivery: 1371, profit: 22035 },
    { date: '22.12', fullDate: new Date('2025-12-22'), day: 'Пн', orders: 8, revenue: 130232, cost: 74769, advertising: 5239, commissions: 10418, tax: 5209, delivery: 1953, profit: 32644 },
    { date: '23.12', fullDate: new Date('2025-12-23'), day: 'Вт', orders: 6, revenue: 78132, cost: 45213, advertising: 2576, commissions: 6250, tax: 3125, delivery: 1171, profit: 19797 },
    { date: '24.12', fullDate: new Date('2025-12-24'), day: 'Ср', orders: 10, revenue: 166100, cost: 104322, advertising: 9351, commissions: 13288, tax: 6644, delivery: 2491, profit: 30004 },
    { date: '25.12', fullDate: new Date('2025-12-25'), day: 'Чт', orders: 8, revenue: 98320, cost: 63308, advertising: 4176, commissions: 7865, tax: 3932, delivery: 1474, profit: 17565 },
    { date: '26.12', fullDate: new Date('2025-12-26'), day: 'Пт', orders: 10, revenue: 139380, cost: 85967, advertising: 5000, commissions: 11150, tax: 5575, delivery: 2090, profit: 29598 },
    { date: '27.12', fullDate: new Date('2025-12-27'), day: 'Сб', orders: 3, revenue: 41886, cost: 23088, advertising: 1946, commissions: 3350, tax: 1675, delivery: 628, profit: 11199 },
    { date: '28.12', fullDate: new Date('2025-12-28'), day: 'Вс', orders: 4, revenue: 63340, cost: 35102, advertising: 3375, commissions: 5067, tax: 2533, delivery: 950, profit: 16313 },
    { date: '29.12', fullDate: new Date('2025-12-29'), day: 'Пн', orders: 8, revenue: 127800, cost: 81872, advertising: 4266, commissions: 10224, tax: 5112, delivery: 1917, profit: 24409 },
    { date: '30.12', fullDate: new Date('2025-12-30'), day: 'Вт', orders: 7, revenue: 93940, cost: 57528, advertising: 3843, commissions: 7515, tax: 3757, delivery: 1409, profit: 19888 },
    { date: '31.12', fullDate: new Date('2025-12-31'), day: 'Ср', orders: 7, revenue: 94248, cost: 57795, advertising: 5454, commissions: 7539, tax: 3769, delivery: 1413, profit: 18278 },
    { date: '01.01', fullDate: new Date('2026-01-01'), day: 'Чт', orders: 6, revenue: 96648, cost: 56235, advertising: 5106, commissions: 7731, tax: 3865, delivery: 1449, profit: 22262 },
    { date: '02.01', fullDate: new Date('2026-01-02'), day: 'Пт', orders: 6, revenue: 98496, cost: 57964, advertising: 3734, commissions: 7879, tax: 3939, delivery: 1477, profit: 23503 },
    { date: '03.01', fullDate: new Date('2026-01-03'), day: 'Сб', orders: 6, revenue: 84336, cost: 52598, advertising: 3573, commissions: 6746, tax: 3373, delivery: 1265, profit: 16781 },
    { date: '04.01', fullDate: new Date('2026-01-04'), day: 'Вс', orders: 3, revenue: 47598, cost: 30346, advertising: 1658, commissions: 3807, tax: 1903, delivery: 713, profit: 9171 },
    { date: '05.01', fullDate: new Date('2026-01-05'), day: 'Пн', orders: 6, revenue: 83970, cost: 46366, advertising: 4438, commissions: 6717, tax: 3358, delivery: 1259, profit: 21832 },
    { date: '06.01', fullDate: new Date('2026-01-06'), day: 'Вт', orders: 10, revenue: 120910, cost: 67715, advertising: 4415, commissions: 9672, tax: 4836, delivery: 1813, profit: 32459 },
    { date: '07.01', fullDate: new Date('2026-01-07'), day: 'Ср', orders: 9, revenue: 110520, cost: 70451, advertising: 4778, commissions: 8841, tax: 4420, delivery: 1657, profit: 20373 },
    { date: '08.01', fullDate: new Date('2026-01-08'), day: 'Чт', orders: 5, revenue: 66415, cost: 41477, advertising: 3352, commissions: 5313, tax: 2656, delivery: 996, profit: 12621 },
    { date: '09.01', fullDate: new Date('2026-01-09'), day: 'Пт', orders: 5, revenue: 77420, cost: 42723, advertising: 3410, commissions: 6193, tax: 3096, delivery: 1161, profit: 20837 },
    { date: '10.01', fullDate: new Date('2026-01-10'), day: 'Сб', orders: 5, revenue: 76740, cost: 45701, advertising: 4049, commissions: 6139, tax: 3069, delivery: 1151, profit: 16631 },
    { date: '11.01', fullDate: new Date('2026-01-11'), day: 'Вс', orders: 3, revenue: 42747, cost: 27050, advertising: 2086, commissions: 3419, tax: 1709, delivery: 641, profit: 7842 },
    { date: '12.01', fullDate: new Date('2026-01-12'), day: 'Пн', orders: 8, revenue: 99840, cost: 56160, advertising: 5256, commissions: 7987, tax: 3993, delivery: 1497, profit: 24947 },
    { date: '13.01', fullDate: new Date('2026-01-13'), day: 'Вт', orders: 5, revenue: 61955, cost: 35617, advertising: 3021, commissions: 4956, tax: 2478, delivery: 929, profit: 14954 },
    { date: '14.01', fullDate: new Date('2026-01-14'), day: 'Ср', orders: 10, revenue: 149080, cost: 93844, advertising: 6674, commissions: 11926, tax: 5963, delivery: 2236, profit: 28437 },
    { date: '15.01', fullDate: new Date('2026-01-15'), day: 'Чт', orders: 8, revenue: 96400, cost: 56768, advertising: 5062, commissions: 7712, tax: 3856, delivery: 1446, profit: 21556 },
    { date: '16.01', fullDate: new Date('2026-01-16'), day: 'Пт', orders: 8, revenue: 100440, cost: 62590, advertising: 4856, commissions: 8035, tax: 4017, delivery: 1506, profit: 19436 },
    { date: '17.01', fullDate: new Date('2026-01-17'), day: 'Сб', orders: 5, revenue: 64920, cost: 37584, advertising: 2874, commissions: 5193, tax: 2596, delivery: 973, profit: 15700 },
    { date: '18.01', fullDate: new Date('2026-01-18'), day: 'Вс', orders: 5, revenue: 81840, cost: 52239, advertising: 4386, commissions: 6547, tax: 3273, delivery: 1227, profit: 14168 },
    { date: '19.01', fullDate: new Date('2026-01-19'), day: 'Пн', orders: 8, revenue: 110864, cost: 66251, advertising: 5774, commissions: 8869, tax: 4434, delivery: 1662, profit: 23874 }
  ],

  topProducts: [
    {
      id: '1',
      name: 'iPhone 14 Pro 256GB Deep Purple',
      sku: 'APL-IP14P-256-DP',
      image: '📱',
      sales: 12,
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

type TabType = 'finances' | 'sales' | 'warehouse' | 'reviews';

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
  const validTabs: TabType[] = ['finances', 'sales', 'warehouse', 'reviews'];
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

  // Попапы для способов доставки
  const [showMyDeliveryPopup, setShowMyDeliveryPopup] = useState(false);
  const [showExpressPopup, setShowExpressPopup] = useState(false);
  const [showPickupPopup, setShowPickupPopup] = useState(false);

  // Выбранный склад для вкладки warehouse
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
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
      const monthLabel = format(day.fullDate, 'MMM yyyy', { locale: ru });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          date: monthLabel,
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
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
                  onClick={() => setActiveTab('warehouse')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'warehouse'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Склад
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

            {/* Date Range Selector - скрыт для вкладки Отзывы */}
            {activeTab !== 'reviews' && (
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
            )}
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
            >
              <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Поступления</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-sky-600">{(data.totalRevenue / 1000).toFixed(0)}K ₸</div>
                <div className="text-xs text-gray-500 mt-1">
                  <span className="bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-medium">{formatShortPeriod()}</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 rotate-180" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Расходы</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-rose-400">
                  {((data.totalCost + data.totalAdvertising + data.totalTax + data.totalCommissions + data.totalDelivery) / 1000).toFixed(0)}K ₸
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded font-medium text-xs">{formatShortPeriod()}</span>
                  <button
                    onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    <span>Детали</span>
                    <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${showExpenseDetails ? 'rotate-180' : ''}`} />
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
                      <div className="space-y-1.5 text-xs mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-gray-600">
                          <span>Себестоимость</span>
                          <span className="font-medium">{(data.totalCost / 1000).toFixed(0)}K ₸</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Реклама</span>
                          <span className="font-medium">{(data.totalAdvertising / 1000).toFixed(0)}K ₸</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Налог</span>
                          <span className="font-medium">{(data.totalTax / 1000).toFixed(0)}K ₸</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Комиссия</span>
                          <span className="font-medium">{(data.totalCommissions / 1000).toFixed(0)}K ₸</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Доставка</span>
                          <span className="font-medium">{(data.totalDelivery / 1000).toFixed(0)}K ₸</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">Прибыль</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-teal-500">{(data.totalProfit / 1000).toFixed(0)}K ₸</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded font-medium text-xs">{formatShortPeriod()}</span>
                  <span className="text-xs text-gray-500">{profitMargin}%</span>
                </div>
              </motion.div>
            </motion.div>

        {/* Financial Charts */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          {/* Revenue Structure Chart - Stacked Bar */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <h3 className="text-base sm:text-xl font-semibold text-gray-900">Структура выручки</h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">{formatShortPeriod()}</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280} className="sm:!h-[400px]">
              <BarChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value) => value !== undefined ? [`${value.toLocaleString('ru-RU')} ₸`] : ['']}
                  labelFormatter={(label) => `Дата: ${label}`}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="cost" stackId="expenses" name="Закупочная стоимость" fill="#f5a3b0" radius={[0, 0, 0, 0]} />
                <Bar dataKey="commissions" stackId="expenses" name="Комиссия Kaspi" fill="#e88a7d" radius={[0, 0, 0, 0]} />
                <Bar dataKey="tax" stackId="expenses" name="Налоги" fill="#93c5fd" radius={[0, 0, 0, 0]} />
                <Bar dataKey="advertising" stackId="expenses" name="Реклама" fill="#a3e635" radius={[0, 0, 0, 0]} />
                <Bar dataKey="delivery" stackId="expenses" name="Стоимость доставки" fill="#d8b4fe" radius={[0, 0, 0, 0]} />
                <Bar dataKey="profit" stackId="expenses" name="Прибыль" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Money Flow Chart - Line */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <h3 className="text-base sm:text-xl font-semibold text-gray-900">Движение денег</h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">{formatShortPeriod()}</span>
              </div>

              {/* Previous Period Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600">Прошлый период</span>
                <button
                  onClick={() => setShowPreviousPeriod(!showPreviousPeriod)}
                  className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors cursor-pointer ${
                    showPreviousPeriod ? 'bg-gray-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                      showPreviousPeriod ? 'translate-x-4 sm:translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280} className="sm:!h-[400px]">
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                  }}
                />
                <Legend />
                {/* Current Period Lines */}
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Поступления (₸)"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ fill: '#0ea5e9', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalExpenses"
                  name="Расходы (₸)"
                  stroke="#fb7185"
                  strokeWidth={3}
                  dot={{ fill: '#fb7185', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Прибыль (₸)"
                  stroke="#2dd4bf"
                  strokeWidth={3}
                  dot={{ fill: '#2dd4bf', r: 4 }}
                />
                {/* Previous Period Lines (Dashed) */}
                {showPreviousPeriod && (
                  <Line
                    type="monotone"
                    dataKey="prevRevenue"
                    name="Поступления прошл. (₸)"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#0ea5e9', r: 2 }}
                    opacity={0.5}
                  />
                )}
                {showPreviousPeriod && (
                  <Line
                    type="monotone"
                    dataKey="prevExpenses"
                    name="Расходы прошл. (₸)"
                    stroke="#fb7185"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#fb7185', r: 2 }}
                    opacity={0.5}
                  />
                )}
                {showPreviousPeriod && (
                  <Line
                    type="monotone"
                    dataKey="prevProfit"
                    name="Прибыль прошл. (₸)"
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
          <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Детализация по дням</h3>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">{formatShortPeriod()}</span>
            </div>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-xs sm:text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-500 text-left">Дата</th>
                    <th className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-sky-600 text-right">Поступления</th>
                    <th className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-rose-400 text-right">Расходы</th>
                    <th className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-teal-500 text-right">Прибыль</th>
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
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-900 text-left whitespace-nowrap">{day.date} ({day.day})</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-sky-600 font-medium text-right whitespace-nowrap">
                          {day.revenue.toLocaleString('ru-RU')} ₸
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-rose-400 font-medium text-right whitespace-nowrap">
                          {dayExpenses.toLocaleString('ru-RU')} ₸
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-teal-500 font-medium text-right whitespace-nowrap">
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
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-900 text-left">Итого</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-sky-600 text-right whitespace-nowrap">
                      {data.totalRevenue.toLocaleString('ru-RU')} ₸
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-rose-400 text-right whitespace-nowrap">
                      {(data.totalCost + data.totalAdvertising + data.totalCommissions + data.totalTax + data.totalDelivery).toLocaleString('ru-RU')} ₸
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-teal-500 text-right whitespace-nowrap">
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
            {/* Period Info */}
            <div className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Период: <span className="text-gray-500">{formatShortPeriod()}</span></span>
              <span className="text-gray-300">|</span>
              <span>{data.totalOrders} заказов</span>
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
                </div>
                <div className="text-lg sm:text-2xl font-bold text-blue-600">58%</div>
                <div className="text-[10px] sm:text-xs mt-1">
                  <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{formatShortPeriod()}</span>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-amber-200 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setShowPendingOrdersPopup(true)}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  </div>
                  <span className="text-xs sm:text-sm text-amber-700">В пути</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-amber-700">{data.pendingOrders?.count || 0}</div>
                <div className="text-[10px] sm:text-xs mt-1 text-amber-600">
                  {((data.pendingOrders?.totalAmount || 0) / 1000000).toFixed(1)}M ₸ ожидает
                </div>
              </motion.div>
            </motion.div>

            {/* Orders Chart - Full Width */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-6 sm:mb-8"
            >
              <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-xl font-semibold text-gray-900">Количество заказов</h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">{formatShortPeriod()}</span>
                </div>
                <ResponsiveContainer width="100%" height={240} className="sm:!h-[300px]">
                  <BarChart data={data.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="orders"
                      name="Заказы"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                      onClick={handleBarClick}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </motion.div>

            {/* Pie Charts - Side by Side */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
            >
              {/* Sales Sources Distribution */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-4">
                  <h3 className="text-base sm:text-xl font-semibold text-gray-900">Источники продаж</h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">{formatShortPeriod()}</span>
                </div>
                <ResponsiveContainer width="100%" height={180} className="sm:!h-[200px]">
                  <PieChart>
                    <Pie
                      data={salesSourcesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data) => {
                        if (data.name === 'Органика') setShowOrganicPopup(true);
                        else if (data.name === 'Реклама') setShowAdsPopup(true);
                        else if (data.name === 'Оффлайн') setShowOfflineSourcePopup(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {salesSourcesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={SALES_SOURCE_COLORS[index % SALES_SOURCE_COLORS.length]} style={{ cursor: 'pointer' }} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Детализация */}
                <div className="mt-4 space-y-3">
                  {salesSourcesData.map((item, index) => {
                    const total = salesSourcesData.reduce((sum, i) => sum + i.value, 0);
                    const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                    const revenuePercent = Number(percent) / 100;
                    const itemRevenue = Math.round(data.totalRevenue * revenuePercent);
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                        onClick={() => {
                          if (item.name === 'Органика') setShowOrganicPopup(true);
                          else if (item.name === 'Реклама') setShowAdsPopup(true);
                          else if (item.name === 'Оффлайн') setShowOfflineSourcePopup(true);
                        }}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SALES_SOURCE_COLORS[index] }}
                        />
                        <div className="flex-1 flex justify-between items-center">
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-sm font-medium text-gray-900">{item.value} зак.</span>
                              <span className="text-gray-300 mx-1.5">•</span>
                              <span className="text-sm font-medium text-gray-900">{(itemRevenue / 1000).toFixed(0)}K ₸</span>
                              <span className="text-gray-300 mx-1.5">•</span>
                              <span className="text-sm text-gray-500">{percent}%</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Delivery Mode */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-4">
                  <h3 className="text-base sm:text-xl font-semibold text-gray-900">Способы доставки</h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">{formatShortPeriod()}</span>
                </div>
                <ResponsiveContainer width="100%" height={180} className="sm:!h-[200px]">
                  <PieChart>
                    <Pie
                      data={deliveryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
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
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Детализация */}
                <div className="mt-4 space-y-1">
                  {deliveryData.map((item, index) => {
                    const total = deliveryData.reduce((sum, i) => sum + i.value, 0);
                    const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                    const revenuePercent = Number(percent) / 100;
                    const itemRevenue = Math.round(data.totalRevenue * revenuePercent);
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
                          className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                          onClick={handleItemClick}
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: DELIVERY_COLORS[index] }}
                          />
                          <div className="flex-1 flex justify-between items-center">
                            <span className="text-sm text-gray-700">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="text-sm font-medium text-gray-900">{item.value} зак.</span>
                                <span className="text-gray-300 mx-1.5">•</span>
                                <span className="text-sm font-medium text-gray-900">{(itemRevenue / 1000).toFixed(0)}K ₸</span>
                                <span className="text-gray-300 mx-1.5">•</span>
                                <span className="text-sm text-gray-500">{percent}%</span>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isIntercity && showCitiesDropdown ? 'rotate-180' : ''}`} />
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
                              className="overflow-hidden ml-5 border-l-2 border-purple-200 pl-3"
                            >
                              {citiesData.map((city) => {
                                const avgOrderValue = data.totalRevenue / data.totalOrders;
                                const cityRevenue = Math.round(city.orders * avgOrderValue);
                                return (
                                  <div
                                    key={city.name}
                                    className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCityPopup(city.name);
                                    }}
                                  >
                                    <span className="text-sm text-gray-600">{city.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-900">{city.orders} зак.</span>
                                      <span className="text-gray-300">•</span>
                                      <span className="text-sm text-gray-600">{(cityRevenue / 1000).toFixed(0)}K ₸</span>
                                      <ChevronRight className="w-3 h-3 text-gray-400" />
                                    </div>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>

            {/* Рекламная аналитика */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mt-6 sm:mt-8"
            >
              <motion.div variants={itemVariants} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-200">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Эффективность рекламы</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Анализ окупаемости рекламных затрат</p>
                  </div>
                </div>

                {/* Метрики рекламы */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <div className="bg-white rounded-xl p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">Расход на рекламу</div>
                    <div className="text-lg sm:text-2xl font-bold text-amber-600">{data.totalAdvertising.toLocaleString('ru-RU')} ₸</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">Заказов с рекламы</div>
                    <div className="text-lg sm:text-2xl font-bold text-emerald-600">{data.ordersBySource.ads}</div>
                    <div className="text-[10px] sm:text-xs text-gray-400">{((data.ordersBySource.ads / data.totalOrders) * 100).toFixed(0)}% от всех заказов</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">Цена заказа (CAC)</div>
                    <div className="text-lg sm:text-2xl font-bold text-blue-600">
                      {data.ordersBySource.ads > 0 ? Math.round(data.totalAdvertising / data.ordersBySource.ads).toLocaleString('ru-RU') : 0} ₸
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-400">стоимость привлечения</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">ROAS</div>
                    <div className={`text-lg sm:text-2xl font-bold ${
                      data.totalAdvertising > 0 && (data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising >= 3
                        ? 'text-emerald-600'
                        : (data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising >= 2
                          ? 'text-amber-600'
                          : 'text-red-500'
                    }`}>
                      {data.totalAdvertising > 0 ? ((data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising).toFixed(1) : 0}x
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-400">окупаемость рекламы</div>
                  </div>
                </div>

                {/* Сравнение органика vs реклама */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Органика */}
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="font-medium text-gray-900">Органика</span>
                      <span className="text-xs text-gray-500 ml-auto">{data.ordersBySource.organic} заказов</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Выручка</span>
                        <span className="font-medium text-gray-900">{Math.round(data.ordersBySource.organic * data.avgOrderValue).toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Затраты на привлечение</span>
                        <span className="font-medium text-emerald-600">0 ₸</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-gray-700 font-medium">Чистая маржа</span>
                        <span className="font-bold text-emerald-600">100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Реклама */}
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="font-medium text-gray-900">Реклама</span>
                      <span className="text-xs text-gray-500 ml-auto">{data.ordersBySource.ads} заказов</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Выручка</span>
                        <span className="font-medium text-gray-900">{Math.round(data.ordersBySource.ads * data.avgOrderValue).toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Затраты на рекламу</span>
                        <span className="font-medium text-red-500">-{data.totalAdvertising.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-gray-700 font-medium">Прибыль от рекламы</span>
                        <span className={`font-bold ${(data.ordersBySource.ads * data.avgOrderValue - data.totalAdvertising) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {(data.ordersBySource.ads * data.avgOrderValue - data.totalAdvertising).toLocaleString('ru-RU')} ₸
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Индикатор рентабельности */}
                <div className="mt-4 p-3 sm:p-4 bg-white rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Рентабельность рекламы</span>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                      data.totalAdvertising > 0 && (data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising >= 3
                        ? 'bg-emerald-100 text-emerald-700'
                        : (data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising >= 2
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {data.totalAdvertising > 0 && (data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising >= 3
                        ? 'Отлично'
                        : (data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising >= 2
                          ? 'Нормально'
                          : 'Низкая'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        data.totalAdvertising > 0 && (data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising >= 3
                          ? 'bg-emerald-500'
                          : (data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising >= 2
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(((data.ordersBySource.ads * data.avgOrderValue) / data.totalAdvertising / 5) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0x</span>
                    <span>2x</span>
                    <span>3x</span>
                    <span>5x+</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}

        {/* Warehouse Tab - Движение склада */}
        {activeTab === 'warehouse' && (() => {
          // Данные товаров с привязкой к складам
          const warehouseProducts = [
            { id: 1, name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', image: '📱', stock: 45, minStock: 10, costPerUnit: 352500, salePrice: 449900, profit: 52410, inTransit: false, warehouse: 'almaty_main' },
            { id: 2, name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', image: '📱', stock: 12, minStock: 10, costPerUnit: 297300, salePrice: 389900, profit: 53610, inTransit: false, warehouse: 'almaty_main' },
            { id: 3, name: 'AirPods Pro 2', sku: 'APL-APP2', image: '🎧', stock: 8, minStock: 15, costPerUnit: 58800, salePrice: 89900, profit: 22110, inTransit: true, inTransitQty: 20, warehouse: 'almaty_taugul' },
            { id: 4, name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', image: '💻', stock: 3, minStock: 5, costPerUnit: 688000, salePrice: 849900, profit: 76910, inTransit: true, inTransitQty: 10, warehouse: 'almaty_taugul' },
            { id: 5, name: 'iPad Air 5th Gen', sku: 'APL-IPA5', image: '📲', stock: 0, minStock: 8, costPerUnit: 213000, salePrice: 289900, profit: 47910, inTransit: true, inTransitQty: 15, warehouse: 'osipenko' },
            { id: 6, name: 'Apple Watch Ultra', sku: 'APL-AWU', image: '⌚', stock: 28, minStock: 10, costPerUnit: 286200, salePrice: 379900, profit: 55710, inTransit: false, warehouse: 'almaty_main' },
            { id: 7, name: 'Sony WH-1000XM5', sku: 'SNY-WH1000', image: '🎧', stock: 15, minStock: 10, costPerUnit: 96500, salePrice: 149900, profit: 38410, inTransit: false, warehouse: 'osipenko' },
            { id: 8, name: 'Samsung Galaxy Tab S9', sku: 'SAM-GTS9', image: '📲', stock: 52, minStock: 15, costPerUnit: 237800, salePrice: 329900, profit: 59110, inTransit: false, warehouse: 'almaty_main' },
            { id: 9, name: 'Google Pixel 8 Pro', sku: 'GGL-PX8P', image: '📱', stock: 6, minStock: 10, costPerUnit: 257200, salePrice: 349900, profit: 57710, inTransit: false, warehouse: 'astana' },
            { id: 10, name: 'Nintendo Switch OLED', sku: 'NTD-SWOLED', image: '🎮', stock: 19, minStock: 10, costPerUnit: 112500, salePrice: 159900, profit: 31410, inTransit: false, warehouse: 'osipenko' },
            { id: 11, name: 'DJI Mini 3 Pro', sku: 'DJI-M3P', image: '🚁', stock: 4, minStock: 5, costPerUnit: 278500, salePrice: 379900, profit: 63410, inTransit: false, warehouse: 'astana' },
            { id: 12, name: 'Bose QuietComfort 45', sku: 'BOS-QC45', image: '🎧', stock: 0, minStock: 8, costPerUnit: 83400, salePrice: 129900, profit: 33510, inTransit: false, warehouse: 'almaty_taugul' },
          ];

          // Фильтруем товары по выбранному складу
          const filteredProducts = selectedWarehouse === 'all'
            ? warehouseProducts
            : warehouseProducts.filter(p => p.warehouse === selectedWarehouse);

          // Статистика по выбранному складу
          const warehouseStats = {
            total: filteredProducts.length,
            totalUnits: filteredProducts.reduce((sum, p) => sum + p.stock, 0),
            totalValue: filteredProducts.reduce((sum, p) => sum + (p.stock * p.costPerUnit), 0),
            inStock: filteredProducts.filter(p => p.stock >= p.minStock).length,
            inTransit: filteredProducts.filter(p => p.inTransit).length,
            inTransitUnits: filteredProducts.filter(p => p.inTransit).reduce((sum, p) => sum + (p.inTransitQty || 0), 0),
            lowStock: filteredProducts.filter(p => p.stock > 0 && p.stock < p.minStock).length,
            outOfStock: filteredProducts.filter(p => p.stock === 0).length,
          };

          return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Warehouse Tabs */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Все склады' },
                  { id: 'almaty_main', label: 'Основной Алматы' },
                  { id: 'almaty_taugul', label: 'Алматы Таугуль 13' },
                  { id: 'osipenko', label: 'Осипенко 35А' },
                  { id: 'astana', label: 'Астана' },
                ].map((warehouse) => (
                  <button
                    key={warehouse.id}
                    onClick={() => setSelectedWarehouse(warehouse.id)}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      selectedWarehouse === warehouse.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {warehouse.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Period Info */}
            <div className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Период: <span className="text-gray-500">{formatShortPeriod()}</span></span>
              <span className="text-gray-300">|</span>
              <span>{warehouseStats.totalUnits} единиц{selectedWarehouse === 'all' ? ' на всех складах' : ''}</span>
            </div>

            {/* Warehouse Stats Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-600 text-xs sm:text-sm">Всего</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{warehouseStats.total}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{warehouseStats.totalUnits} ед. на {(warehouseStats.totalValue / 1000000).toFixed(1)}M ₸</div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <span className="text-gray-600 text-xs sm:text-sm">В наличии</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600">{warehouseStats.inStock}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">позиций</div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-600 text-xs sm:text-sm">В пути</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-purple-600">{warehouseStats.inTransit}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{warehouseStats.inTransitUnits} единиц</div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  </div>
                  <span className="text-gray-600 text-xs sm:text-sm">Мало</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-amber-600">{warehouseStats.lowStock}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">позиций</div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  </div>
                  <span className="text-gray-600 text-xs sm:text-sm">Нет</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-red-600">{warehouseStats.outOfStock}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">позиций</div>
              </div>
            </motion.div>

            {/* Products Table */}
            <motion.div variants={itemVariants} className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
              <div className="p-3 sm:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                  <h3 className="text-lg sm:text-2xl font-semibold text-gray-900">Аналитика склада</h3>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs sm:text-sm font-medium w-fit">{formatShortPeriod()}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">Детальная информация по остаткам и прибыльности</p>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const roi = (product.profit / product.costPerUnit) * 100;
                  const status = product.stock === 0 ? 'out' : product.stock < product.minStock ? 'low' : 'in_stock';
                  return (
                    <div key={product.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-base flex-shrink-0">
                          {product.image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{product.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{product.sku}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-gray-900">{product.stock} шт</div>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            status === 'out' ? 'bg-red-100 text-red-700' :
                            status === 'low' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {status === 'out' ? 'Нет' : status === 'low' ? 'Мало' : 'Есть'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs">
                          <span className="text-gray-500">Себест: </span>
                          <span className="font-medium text-gray-900">{(product.costPerUnit / 1000).toFixed(0)}к ₸</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-500">Прибыль: </span>
                          <span className="font-medium text-emerald-600">{(product.profit / 1000).toFixed(0)}к ₸</span>
                        </div>
                        <div className="text-xs">
                          <span className={`font-medium ${roi >= 15 ? 'text-emerald-600' : roi >= 10 ? 'text-blue-600' : 'text-amber-600'}`}>
                            ROI {roi.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {product.inTransit && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-purple-600">
                          <Truck className="w-3 h-3" />
                          <span>В пути: {product.inTransitQty} шт</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Товар</th>
                      <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Остаток</th>
                      <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">В пути</th>
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Себестоимость</th>
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Цена продажи</th>
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Прибыль</th>
                      <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ROI</th>
                      <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => {
                      const roi = (product.profit / product.costPerUnit) * 100;
                      const status = product.stock === 0 ? 'out' : product.stock < product.minStock ? 'low' : 'in_stock';
                      return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 lg:px-6 py-3">
                            <div className="flex items-center gap-2 lg:gap-3">
                              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg lg:text-xl flex-shrink-0">
                                {product.image}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate max-w-[120px] lg:max-w-none">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-gray-900">{product.stock} шт</div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-center hidden lg:table-cell">
                            {product.inTransit ? (
                              <div className="flex items-center justify-center gap-1 text-sm text-purple-600">
                                <Truck className="w-3.5 h-3.5" />
                                {product.inTransitQty} шт
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">{product.costPerUnit.toLocaleString('ru-RU')} ₸</div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-right hidden lg:table-cell">
                            <div className="text-sm font-medium text-blue-600">{product.salePrice.toLocaleString('ru-RU')} ₸</div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-right">
                            <div className="text-sm font-bold text-emerald-600">{product.profit.toLocaleString('ru-RU')} ₸</div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-center">
                            <span className={`text-sm font-medium ${roi >= 15 ? 'text-emerald-600' : roi >= 10 ? 'text-blue-600' : 'text-amber-600'}`}>
                              {roi.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              status === 'out' ? 'bg-red-100 text-red-700' :
                              status === 'low' ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {status === 'out' && <><XCircle className="w-3 h-3" /> Нет</>}
                              {status === 'low' && <><AlertTriangle className="w-3 h-3" /> Мало</>}
                              {status === 'in_stock' && <><CheckCircle className="w-3 h-3" /> Есть</>}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm">
                  <span className="text-gray-500">Показано {filteredProducts.length} товаров</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Общая стоимость остатков:</span>
                    <span className="font-bold text-gray-900">{warehouseStats.totalValue.toLocaleString('ru-RU')} ₸</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-6"
          >
            {/* Метрики отзывов */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-gray-600 text-sm">Средний рейтинг</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {mockAnalyticsData.reviewsData.averageRating}
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= Math.round(mockAnalyticsData.reviewsData.averageRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-emerald-500 mt-1">+0.2 vs прошлый период</div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-600 text-sm">Всего отзывов</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{mockAnalyticsData.reviewsData.totalReviews}</div>
                <div className="text-xs text-emerald-500 mt-1">+18 за период</div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <ThumbsUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-gray-600 text-sm">Положительные</span>
                </div>
                <div className="text-2xl font-bold text-emerald-600">{mockAnalyticsData.reviewsData.positiveReviews}</div>
                <div className="text-xs text-gray-500 mt-1">{((mockAnalyticsData.reviewsData.positiveReviews / mockAnalyticsData.reviewsData.totalReviews) * 100).toFixed(0)}% от всех</div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-600 text-sm">За неделю</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">23</div>
                <div className="text-xs text-emerald-500 mt-1">+5 vs прошлая неделя</div>
              </div>
            </motion.div>

            {/* Распределение по звездам и график динамики */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Распределение по рейтингу */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm p-6">
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

              {/* График динамики отзывов */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Динамика отзывов</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockAnalyticsData.reviewsData.dailyReviews}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="positive"
                        name="Положительные"
                        fill="#10b981"
                        stackId="a"
                        cursor="pointer"
                        onClick={(_data, _index, e) => {
                          const payload = (e as unknown as { payload?: { date?: string } })?.payload;
                          if (payload?.date) {
                            setSelectedReviewsDay(payload.date);
                            setShowReviewsDayPopup(true);
                          }
                        }}
                      />
                      <Bar
                        dataKey="neutral"
                        name="Нейтральные"
                        fill="#f59e0b"
                        stackId="a"
                        cursor="pointer"
                        onClick={(_data, _index, e) => {
                          const payload = (e as unknown as { payload?: { date?: string } })?.payload;
                          if (payload?.date) {
                            setSelectedReviewsDay(payload.date);
                            setShowReviewsDayPopup(true);
                          }
                        }}
                      />
                      <Bar
                        dataKey="negative"
                        name="Негативные"
                        fill="#ef4444"
                        stackId="a"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(_data, _index, e) => {
                          const payload = (e as unknown as { payload?: { date?: string } })?.payload;
                          if (payload?.date) {
                            setSelectedReviewsDay(payload.date);
                            setShowReviewsDayPopup(true);
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

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

                  {/* Orders */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Заказы ({selectedTableDay.orders})</h3>
                    <div className="space-y-2">
                      {Array.from({ length: Math.min(selectedTableDay.orders, 5) }).map((_, i) => {
                        const orderNum = 100000 + (i + 1) * 12345;
                        const orderAmount = Math.round(selectedTableDay.revenue / selectedTableDay.orders * (0.8 + (i * 0.1)));
                        const productIndex = i % data.topProducts.length;
                        const product = data.topProducts[productIndex];
                        const isOrganic = i % 3 !== 0;
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-medium text-gray-900">Заказ #{orderNum}</div>
                              <div className="text-sm text-gray-700 truncate">{product.name}</div>
                              <div className={`text-xs ${isOrganic ? 'text-blue-500' : 'text-orange-500'}`}>
                                {isOrganic ? 'Органика' : 'Реклама'}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-semibold text-gray-900">{orderAmount.toLocaleString('ru-RU')} ₸</div>
                              <div className="text-xs text-emerald-600">Доставлен</div>
                            </div>
                          </div>
                        );
                      })}
                      {selectedTableDay.orders > 5 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... и ещё {selectedTableDay.orders - 5} заказов
                        </div>
                      )}
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
                      <span className="text-gray-600">ROAS (окупаемость)</span>
                      <span className="font-bold text-orange-600">{((data.totalRevenue * 0.4) / data.totalAdvertising).toFixed(1)}x</span>
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

      </div>
    </div>
  );
}
