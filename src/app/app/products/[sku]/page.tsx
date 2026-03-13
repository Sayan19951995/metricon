'use client';

import { useState, use } from 'react';
import { ShoppingBag, DollarSign, Package, Megaphone, Calculator, TrendingUp } from 'lucide-react';

type Period = 'week' | 'month' | 'year';

export default function ProductAnalyticsPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = use(params);
  const [period, setPeriod] = useState<Period>('month');

  // Фиктивное название товара на основе SKU
  const productName = 'iPhone 14 Pro 256GB Deep Purple';
  const productImage = '📱';

  // Фиктивные данные для визуализации
  const mockData = {
    week: {
      sales: 45,
      revenue: 675000,
      cost: 425000,
      advertising: 38000,
      commissions: 54000,
      profit: 158000,
      salesData: [
        { day: 'Пн', date: '13.01', sales: 8, revenue: 120000 },
        { day: 'Вт', date: '14.01', sales: 6, revenue: 90000 },
        { day: 'Ср', date: '15.01', sales: 7, revenue: 105000 },
        { day: 'Чт', date: '16.01', sales: 5, revenue: 75000 },
        { day: 'Пт', date: '17.01', sales: 9, revenue: 135000 },
        { day: 'Сб', date: '18.01', sales: 6, revenue: 90000 },
        { day: 'Вс', date: '19.01', sales: 4, revenue: 60000 },
      ]
    },
    month: {
      sales: 187,
      revenue: 2805000,
      cost: 1765000,
      advertising: 158000,
      commissions: 224000,
      profit: 658000,
      salesData: [
        { day: '1', date: '1 янв', sales: 5, revenue: 75000 },
        { day: '2', date: '2 янв', sales: 6, revenue: 90000 },
        { day: '3', date: '3 янв', sales: 7, revenue: 105000 },
        { day: '4', date: '4 янв', sales: 6, revenue: 90000 },
        { day: '5', date: '5 янв', sales: 5, revenue: 75000 },
        { day: '6', date: '6 янв', sales: 8, revenue: 120000 },
        { day: '7', date: '7 янв', sales: 5, revenue: 75000 },
        { day: '8', date: '8 янв', sales: 7, revenue: 105000 },
        { day: '9', date: '9 янв', sales: 6, revenue: 90000 },
        { day: '10', date: '10 янв', sales: 7, revenue: 105000 },
        { day: '11', date: '11 янв', sales: 5, revenue: 75000 },
        { day: '12', date: '12 янв', sales: 6, revenue: 90000 },
        { day: '13', date: '13 янв', sales: 8, revenue: 120000 },
        { day: '14', date: '14 янв', sales: 6, revenue: 90000 },
        { day: '15', date: '15 янв', sales: 7, revenue: 105000 },
        { day: '16', date: '16 янв', sales: 5, revenue: 75000 },
        { day: '17', date: '17 янв', sales: 9, revenue: 135000 },
        { day: '18', date: '18 янв', sales: 6, revenue: 90000 },
        { day: '19', date: '19 янв', sales: 4, revenue: 60000 },
        { day: '20', date: '20 янв', sales: 7, revenue: 105000 },
        { day: '21', date: '21 янв', sales: 6, revenue: 90000 },
        { day: '22', date: '22 янв', sales: 8, revenue: 120000 },
        { day: '23', date: '23 янв', sales: 7, revenue: 105000 },
        { day: '24', date: '24 янв', sales: 6, revenue: 90000 },
        { day: '25', date: '25 янв', sales: 5, revenue: 75000 },
        { day: '26', date: '26 янв', sales: 7, revenue: 105000 },
        { day: '27', date: '27 янв', sales: 8, revenue: 120000 },
        { day: '28', date: '28 янв', sales: 9, revenue: 135000 },
        { day: '29', date: '29 янв', sales: 6, revenue: 90000 },
        { day: '30', date: '30 янв', sales: 7, revenue: 105000 },
        { day: '31', date: '31 янв', sales: 6, revenue: 90000 },
      ]
    },
    year: {
      sales: 2156,
      revenue: 32340000,
      cost: 20350000,
      advertising: 1820000,
      commissions: 2587000,
      profit: 7583000,
      salesData: [
        { day: 'Янв', date: 'Январь 2025', sales: 165, revenue: 2475000 },
        { day: 'Фев', date: 'Февраль 2025', sales: 178, revenue: 2670000 },
        { day: 'Мар', date: 'Март 2025', sales: 189, revenue: 2835000 },
        { day: 'Апр', date: 'Апрель 2025', sales: 182, revenue: 2730000 },
        { day: 'Май', date: 'Май 2025', sales: 195, revenue: 2925000 },
        { day: 'Июн', date: 'Июнь 2025', sales: 187, revenue: 2805000 },
        { day: 'Июл', date: 'Июль 2025', sales: 176, revenue: 2640000 },
        { day: 'Авг', date: 'Август 2025', sales: 169, revenue: 2535000 },
        { day: 'Сен', date: 'Сентябрь 2025', sales: 183, revenue: 2745000 },
        { day: 'Окт', date: 'Октябрь 2025', sales: 192, revenue: 2880000 },
        { day: 'Ноя', date: 'Ноябрь 2025', sales: 198, revenue: 2970000 },
        { day: 'Дек', date: 'Декабрь 2025', sales: 242, revenue: 3630000 },
      ]
    }
  };

  const currentData = mockData[period];
  const maxRevenue = Math.max(...currentData.salesData.map(d => d.revenue));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Назад к товарам</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-4xl shadow-md">
                {productImage}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{productName}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">SKU: {sku}</p>
              </div>
            </div>

            {/* Переключатель периода */}
            <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
              {(['week', 'month', 'year'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    period === p
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {p === 'week' && 'Неделя'}
                  {p === 'month' && 'Месяц'}
                  {p === 'year' && 'Год'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Метрики */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Продажи</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentData.sales}</div>
            <div className="text-xs text-emerald-600 mt-1">+12.5%</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Выручка</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{(currentData.revenue / 1000).toFixed(0)}K ₸</div>
            <div className="text-xs text-blue-600 mt-1">+8.3%</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Себестоимость</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{(currentData.cost / 1000).toFixed(0)}K ₸</div>
            <div className="text-xs text-amber-600 mt-1">63.0%</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Маркетинг</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{(currentData.advertising / 1000).toFixed(0)}K ₸</div>
            <div className="text-xs text-red-600 mt-1">5.6%</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Комиссии+налоги</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{(currentData.commissions / 1000).toFixed(0)}K ₸</div>
            <div className="text-xs text-purple-600 mt-1">8.0%</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Прибыль</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{(currentData.profit / 1000).toFixed(0)}K ₸</div>
            <div className="text-xs text-emerald-600 mt-1">+15.2%</div>
          </div>
        </div>

        {/* График продаж */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Динамика продаж</h3>
          <div className="flex items-end gap-1 h-80">
            {currentData.salesData.map((item, index) => (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="relative w-full flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t hover:from-emerald-600 hover:to-emerald-500 transition-all cursor-pointer group relative"
                    style={{ height: `${(item.revenue / maxRevenue) * 280}px`, minHeight: '20px' }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {item.sales} продаж<br/>
                      {(item.revenue / 1000).toFixed(0)}K ₸
                    </div>
                    {period !== 'month' && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white text-xs font-semibold whitespace-nowrap">
                        {(item.revenue / 1000).toFixed(0)}K
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center mt-1">
                  <div className="text-xs text-gray-900 dark:text-white font-semibold">{item.day}</div>
                  {period !== 'month' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.date}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
