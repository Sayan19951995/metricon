'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Calculator,
  Save,
  Info,
  RotateCcw,
  Receipt,
  Truck,
  ExternalLink,
  Percent
} from 'lucide-react';

// Комиссии Kaspi по категориям
// Источник: https://guide.kaspi.kz/partner/ru/shop/conditions/commissions
const categoryCommissions = [
  { category: 'Смартфоны', rate: '15.5%' },
  { category: 'Телефоны и гаджеты', rate: '12.5-15.5%' },
  { category: 'Аксессуары', rate: '12.5-15.5%' },
  { category: 'ТВ, Аудио, Видео', rate: '12.5-15.5%' },
  { category: 'Украшения', rate: '15.5%' },
  { category: 'Часы', rate: '15.5%' },
  { category: 'Ноутбуки', rate: '12.5%' },
  { category: 'Компьютеры', rate: '12.5%' },
  { category: 'Бытовая техника', rate: '12.5%' },
  { category: 'Одежда, Обувь', rate: '12.5%' },
  { category: 'Продукты питания', rate: '7.3%' },
  { category: 'Аптека', rate: '7.3-12.5%' },
  { category: 'Прочие категории', rate: '12.5%' },
];

// Значения по умолчанию
const defaultSettings = {
  tax: 4,
  deliveryType: 'city' as 'city' | 'kazakhstan' | 'express',
};

// Названия типов доставки
const deliveryTypeLabels = {
  city: 'По городу',
  kazakhstan: 'По Казахстану',
  express: 'Express',
};

// Тарифы для отображения
const deliveryRates = {
  city: [
    { weight: 'до 5 кг', rate: '1,099 ₸' },
    { weight: '5-15 кг', rate: '1,349 ₸' },
    { weight: '15-30 кг', rate: '2,299 ₸' },
    { weight: '30-60 кг', rate: '2,899 ₸' },
    { weight: '60-100 кг', rate: '4,149 ₸' },
    { weight: 'свыше 100 кг', rate: '6,449 ₸' },
  ],
  kazakhstan: [
    { weight: 'до 5 кг', rate: '1,299 ₸' },
    { weight: '5-15 кг', rate: '1,699 ₸' },
    { weight: '15-30 кг', rate: '3,599 ₸' },
    { weight: '30-60 кг', rate: '5,649 ₸' },
    { weight: '60-100 кг', rate: '8,549 ₸' },
    { weight: 'свыше 100 кг', rate: '11,999 ₸' },
  ],
  express: [
    { weight: 'до 5 кг', rate: '1,699 ₸' },
    { weight: '5-15 кг', rate: '1,849 ₸' },
    { weight: '15-30 кг', rate: '3,149 ₸' },
    { weight: '30-60 кг', rate: '3,599 ₸' },
    { weight: '60-100 кг', rate: '5,599 ₸' },
    { weight: 'свыше 100 кг', rate: '8,449 ₸' },
  ],
};

export default function ProfitSettingsPage() {
  const [tax, setTax] = useState(defaultSettings.tax);
  const [deliveryType, setDeliveryType] = useState<'city' | 'kazakhstan' | 'express'>(defaultSettings.deliveryType);
  const [saved, setSaved] = useState(false);

  // Пример расчёта (товар весом 0.5 кг, категория Смартфоны - 15.5%)
  const examplePrice = 100000;
  const exampleCostPrice = 75000;
  const exampleWeight = 0.5; // кг
  const exampleCommissionRate = 15.5; // % для смартфонов
  // Стоимость доставки зависит от выбранного типа
  const exampleDelivery = deliveryType === 'city' ? 1099 : deliveryType === 'kazakhstan' ? 1299 : 1699;
  const exampleCommission = examplePrice * (exampleCommissionRate / 100);
  const exampleTax = examplePrice * (tax / 100);
  const exampleProfit = examplePrice - exampleCostPrice - exampleCommission - exampleTax - exampleDelivery;
  const exampleMargin = ((exampleProfit / examplePrice) * 100).toFixed(1);

  const handleSave = () => {
    // В реальном приложении здесь будет сохранение в базу/localStorage
    console.log('Сохранение настроек:', { tax, deliveryType });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setTax(defaultSettings.tax);
    setDeliveryType(defaultSettings.deliveryType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 lg:mb-8"
          >
            <Link
              href="/app/products"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Назад к товарам</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Настройки расчёта прибыли</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              Укажите параметры для расчёта прибыли по каждому товару
            </p>
          </motion.div>

          {/* Settings Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-6"
          >
            <div className="space-y-6">
              {/* Tax */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Receipt className="w-4 h-4 text-purple-500" />
                  Налог
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.1"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <span className="text-gray-500 font-medium">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Ставка налога зависит от режима налогообложения (ИП, ТОО и т.д.)
                </p>
              </div>

              {/* Kaspi Commission Info */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex gap-3">
                  <Percent className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 w-full">
                    <p className="font-medium mb-2">Комиссия Kaspi (по категории)</p>
                    <p className="text-xs text-blue-600 mb-3">
                      Комиссия определяется автоматически по категории товара
                    </p>
                    <div className="bg-white/50 rounded-lg p-3 text-xs">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-blue-700">
                        {categoryCommissions.map((item) => (
                          <div key={item.category} className="contents">
                            <span>{item.category}</span>
                            <span className="font-medium">{item.rate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <a
                      href="https://guide.kaspi.kz/partner/ru/shop/conditions/commissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-2 text-xs font-medium"
                    >
                      Актуальные комиссии на сайте Kaspi
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

            </div>

            {/* Delivery Type Selection */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex gap-3">
                <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 w-full">
                  <p className="font-medium mb-3">Тип доставки Kaspi</p>

                  {/* Delivery Type Buttons */}
                  <div className="flex gap-2 mb-3">
                    {(['city', 'kazakhstan', 'express'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setDeliveryType(type)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          deliveryType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {deliveryTypeLabels[type]}
                      </button>
                    ))}
                  </div>

                  {/* Rates Table */}
                  <div className="bg-white/50 rounded-lg p-3 text-xs">
                    <p className="font-medium text-blue-800 mb-1">
                      Тарифы ({deliveryTypeLabels[deliveryType]}, свыше 10,000 ₸):
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-blue-700">
                      {deliveryRates[deliveryType].map((tier, idx) => (
                        <React.Fragment key={idx}>
                          <span>{tier.weight}</span>
                          <span>{tier.rate}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <a
                    href="https://guide.kaspi.kz/partner/ru/shop/delivery/shipping/q2288"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-2 text-xs font-medium"
                  >
                    Актуальные тарифы на сайте Kaspi
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Что не учитывается в расчёте:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>Расходы на рекламу</li>
                    <li>Возвраты и брак</li>
                    <li>Прочие операционные расходы</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Сбросить</span>
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saved ? 'Сохранено!' : 'Сохранить'}</span>
              </button>
            </div>
          </motion.div>

          {/* Example Calculation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-gray-900">Пример расчёта</h2>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Цена продажи:</span>
                  <span className="font-medium">{examplePrice.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Закупочная стоимость:</span>
                  <span className="font-medium text-red-600">−{exampleCostPrice.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Комиссия Kaspi (Смартфоны, {exampleCommissionRate}%):</span>
                  <span className="font-medium text-red-600">−{exampleCommission.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Налог ({tax}%):</span>
                  <span className="font-medium text-red-600">−{exampleTax.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Доставка ({deliveryTypeLabels[deliveryType]}, {exampleWeight} кг):</span>
                  <span className="font-medium text-red-600">−{exampleDelivery.toLocaleString()} ₸</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">Расчётная прибыль:</span>
                    <span className={`font-bold ${exampleProfit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {exampleProfit > 0 ? '+' : ''}{exampleProfit.toLocaleString()} ₸
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Маржинальность:</span>
                    <span className={`font-medium ${Number(exampleMargin) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {exampleMargin}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Пример: товар с ценой {examplePrice.toLocaleString()} ₸, себестоимостью {exampleCostPrice.toLocaleString()} ₸ и весом {exampleWeight} кг
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
