'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, TrendingUp, Package, Calculator, CheckCircle, Settings, Plus } from 'lucide-react';
import CreateOrderModal from '@/components/warehouse/CreateOrderModal';

// Анимации
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Mock данные для движения склада
const warehouseMovementData = {
  receipts: [
    { name: 'iPhone 14 Pro 256GB', qty: 25, cost: 187500, date: '15.11' },
    { name: 'Samsung Galaxy S23 Ultra', qty: 18, cost: 162000, date: '14.11' },
    { name: 'AirPods Pro 2', qty: 40, cost: 120000, date: '12.11' },
    { name: 'MacBook Pro 14" M2', qty: 8, cost: 136000, date: '10.11' },
    { name: 'iPad Air 5th Gen', qty: 15, cost: 105000, date: '08.11' },
    { name: 'Apple Watch Ultra', qty: 20, cost: 80000, date: '05.11' },
    { name: 'Sony WH-1000XM5', qty: 30, cost: 56500, date: '03.11' },
  ],
  writeOffs: [
    { id: 1, name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', sales: 32, cost: 187500 },
    { id: 2, name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', sales: 24, cost: 162000 },
    { id: 3, name: 'AirPods Pro 2', sku: 'APL-APP2', sales: 45, cost: 120000 },
    { id: 4, name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', sales: 8, cost: 136000 },
    { id: 5, name: 'iPad Air 5th Gen', sku: 'APL-IPA5', sales: 15, cost: 105000 },
    { id: 6, name: 'Apple Watch Ultra', sku: 'APL-AWU', sales: 18, cost: 80000 },
    { id: 7, name: 'Sony WH-1000XM5', sku: 'SNY-WH1000', sales: 22, cost: 56500 },
  ],
  history: [
    { id: 'ПР-001247', date: '15.11.2025', items: 3, qty: 45, cost: 487500, status: 'completed' },
    { id: 'ПР-001246', date: '14.11.2025', items: 2, qty: 28, cost: 252000, status: 'completed' },
    { id: 'ПР-001245', date: '12.11.2025', items: 1, qty: 40, cost: 120000, status: 'completed' },
    { id: 'ПР-001244', date: '10.11.2025', items: 4, qty: 35, cost: 315000, status: 'completed' },
    { id: 'ПР-001243', date: '08.11.2025', items: 2, qty: 22, cost: 154000, status: 'completed' },
    { id: 'ПР-001242', date: '05.11.2025', items: 3, qty: 50, cost: 175000, status: 'completed' },
    { id: 'ПР-001241', date: '03.11.2025', items: 2, qty: 30, cost: 84000, status: 'completed' },
    { id: 'ПР-001240', date: '01.11.2025', items: 5, qty: 65, cost: 422500, status: 'completed' },
  ]
};

// Подсчет общих значений
const totalReceipts = warehouseMovementData.receipts.reduce((sum, item) => sum + item.qty, 0);
const totalReceiptsCost = warehouseMovementData.receipts.reduce((sum, item) => sum + item.cost, 0);
const totalWriteOffs = warehouseMovementData.writeOffs.reduce((sum, item) => sum + item.sales, 0);
const totalWriteOffsCost = warehouseMovementData.writeOffs.reduce((sum, item) => sum + item.cost, 0);

export default function WarehousePage() {
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Склад</h1>
          <p className="text-sm text-gray-500 mt-1">Движение товаров и приёмки</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <a
            href="/app/warehouse/history"
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            История
          </a>
          <button
            onClick={() => setShowCreateOrderModal(true)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium text-sm cursor-pointer flex-1 sm:flex-none"
          >
            + Заказ
          </button>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Period Info */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>Период: <span className="text-gray-500">01.11 - 15.11</span></span>
          <span className="text-gray-300">|</span>
          <span>+{totalReceipts} / -{totalWriteOffs} шт</span>
        </div>

        {/* Warehouse Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <span className="text-gray-600 text-xs sm:text-sm">Стоимость склада</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">2.8M ₸</div>
            <div className="text-xs text-gray-500 mt-1">текущая оценка</div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <span className="text-gray-600 text-xs sm:text-sm">Поступило</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">{(totalReceiptsCost / 1000).toFixed(0)}K ₸</div>
            <div className="text-xs mt-1">
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">за период</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <span className="text-gray-600 text-xs sm:text-sm">Приемок</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600">{warehouseMovementData.history.length}</div>
            <div className="text-xs mt-1">
              <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">за период</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <span className="text-gray-600 text-xs sm:text-sm">Рентабельность</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">34.2%</div>
            <div className="text-xs text-gray-500 mt-1">оборачиваемость</div>
          </div>
        </motion.div>

        {/* Движение товаров за период */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Поступления */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-emerald-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Поступления</h3>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium">за период</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Приход товаров за период</p>
                </div>
                <div className="text-right">
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600">+{totalReceipts} шт</div>
                  <div className="text-xs sm:text-sm text-gray-500">{totalReceiptsCost.toLocaleString('ru-RU')} ₸</div>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
              {warehouseMovementData.receipts.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.date}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-sm font-semibold text-emerald-600">+{item.qty} шт</div>
                    <div className="text-xs text-gray-500">{item.cost.toLocaleString('ru-RU')} ₸</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Списания/Продажи */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Списания</h3>
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">за период</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Расход товаров за период</p>
                </div>
                <div className="text-right">
                  <div className="text-lg sm:text-2xl font-bold text-red-600">-{totalWriteOffs} шт</div>
                  <div className="text-xs sm:text-sm text-gray-500">{totalWriteOffsCost.toLocaleString('ru-RU')} ₸</div>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
              {warehouseMovementData.writeOffs.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{item.name}</div>
                    <div className="text-xs text-gray-500">Продажи</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-sm font-semibold text-red-600">-{item.sales} шт</div>
                    <div className="text-xs text-gray-500">{item.cost.toLocaleString('ru-RU')} ₸</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* История приемок */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">История приемок</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Все поступления товаров за выбранный период</p>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {warehouseMovementData.history.map((receipt, index) => (
              <div key={index} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">{receipt.id}</div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <CheckCircle className="w-3 h-3" /> Проведено
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-500">{receipt.date}</div>
                  <div className="text-emerald-600 font-medium">+{receipt.qty} шт</div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <div>{receipt.items} позиций</div>
                  <div className="font-medium text-gray-900">{receipt.cost.toLocaleString('ru-RU')} ₸</div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Приемка</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Позиций</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Количество</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Себестоимость</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Статус</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {warehouseMovementData.history.map((receipt, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{receipt.date}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{receipt.id}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-600">{receipt.items}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-emerald-600">+{receipt.qty} шт</div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">{receipt.cost.toLocaleString('ru-RU')} ₸</div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5" /> Проведено
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Итого */}
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-3 gap-4 sm:gap-6">
              <div>
                <div className="text-xs sm:text-sm text-gray-500">Всего приемок</div>
                <div className="text-lg sm:text-xl font-bold text-gray-900">{warehouseMovementData.history.length}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-500">Всего единиц</div>
                <div className="text-lg sm:text-xl font-bold text-emerald-600">+{warehouseMovementData.history.reduce((sum, r) => sum + r.qty, 0)} шт</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-500">Общая себестоимость</div>
                <div className="text-lg sm:text-xl font-bold text-gray-900">{warehouseMovementData.history.reduce((sum, r) => sum + r.cost, 0).toLocaleString('ru-RU')} ₸</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Рентабельность склада */}
        <motion.div variants={itemVariants} className="mt-6 bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Анализ рентабельности склада</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Средняя оборачиваемость</div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">18 дней</div>
              <div className="text-xs text-emerald-600 mt-1">-3 дня vs прошлый период</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-gray-500 mb-1">ROI склада</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">34.2%</div>
              <div className="text-xs text-emerald-600 mt-1">+5.1% vs прошлый период</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Замороженные средства</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-600">245K ₸</div>
              <div className="text-xs text-gray-500 mt-1">товары без движения 30+ дней</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Потенциальная прибыль</div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600">956K ₸</div>
              <div className="text-xs text-gray-500 mt-1">при текущих остатках</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Модальное окно создания заказа */}
      <CreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        onCreateOrder={(order) => {
          console.log('Создан заказ:', order);
          setShowCreateOrderModal(false);
        }}
      />
    </div>
  );
}
