'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Calendar, MessageSquare, ShoppingBag } from 'lucide-react';

export default function AddOrderPage() {
  const router = useRouter();
  const [source, setSource] = useState('cash');
  const [date, setDate] = useState('');
  const [comment, setComment] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Логика создания заказа
    console.log({ source, date, comment, selectedProducts });
    router.push('/app/orders');
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header with Back Button */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Назад к заказам</span>
        </button>
        <h1 className="text-3xl font-bold">Добавить заказ вручную</h1>
        <p className="text-gray-500 text-sm mt-2">Создайте новый заказ с пользовательскими данными</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSubmit} className="max-w-3xl">
          {/* Source of Sale */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Источник продажи
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="cash">💵 Наличные</option>
              <option value="card">💳 Перевод на карту</option>
              <option value="kaspi">🟣 Kaspi</option>
              <option value="marketplace">🛒 Другая площадка</option>
              <option value="social">📱 Социальные сети</option>
            </select>
          </div>

          {/* Products Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
              <Plus className="w-5 h-5 text-emerald-600" />
              Товары
            </label>
            <button
              type="button"
              className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-12 text-gray-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all group cursor-pointer"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-gray-400 group-hover:text-emerald-600" />
                </div>
                <span className="font-medium">Выбрать товары</span>
                <span className="text-xs text-gray-400">Добавьте товары в заказ</span>
              </div>
            </button>
          </div>

          {/* Sale Date */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Дата продажи
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="ДД.ММ.ГГГГ"
            />
          </div>

          {/* Comment */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              rows={4}
              placeholder="Дополнительная информация о заказе"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              Создать заказ
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
