'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Mail,
  Smartphone,
  MessageCircle,
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
  Star,
  ChevronLeft,
  Check,
  X,
  Send,
  Volume2,
  VolumeX
} from 'lucide-react';
import Link from 'next/link';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 }
  }
};

export default function NotificationSettingsPage() {
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [emailSettings, setEmailSettings] = useState({
    newOrders: true,
    orderStatus: true,
    lowStock: true,
    weeklyReport: false,
    monthlyReport: true,
    priceChanges: false,
    newReviews: true,
    marketing: false,
  });

  const [pushSettings, setPushSettings] = useState({
    newOrders: true,
    orderStatus: true,
    lowStock: true,
    priceChanges: false,
    newReviews: true,
  });

  const [telegramSettings, setTelegramSettings] = useState({
    newOrders: true,
    orderStatus: false,
    lowStock: true,
    dailyReport: false,
  });

  const handleConnectTelegram = () => {
    setTelegramConnected(true);
    setShowTelegramModal(false);
    setTelegramCode('');
  };

  const NotificationToggle = ({
    checked,
    onChange,
    label,
    description,
    icon: Icon
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
          {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к настройкам
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Настройки уведомлений</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Управление email, push и Telegram уведомлениями</p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Sound Settings */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  soundEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {soundEnabled ? (
                    <Volume2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Звуковые уведомления</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Воспроизводить звук при новых уведомлениях</p>
                </div>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  soundEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  soundEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </motion.div>

          {/* Email Notifications */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email уведомления</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">robo@example.com</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <NotificationToggle
                icon={ShoppingBag}
                label="Новые заказы"
                description="Уведомление о каждом новом заказе"
                checked={emailSettings.newOrders}
                onChange={() => setEmailSettings({...emailSettings, newOrders: !emailSettings.newOrders})}
              />
              <NotificationToggle
                icon={Package}
                label="Изменение статуса заказа"
                description="Когда заказ меняет статус"
                checked={emailSettings.orderStatus}
                onChange={() => setEmailSettings({...emailSettings, orderStatus: !emailSettings.orderStatus})}
              />
              <NotificationToggle
                icon={AlertTriangle}
                label="Низкие остатки"
                description="Когда товар заканчивается на складе"
                checked={emailSettings.lowStock}
                onChange={() => setEmailSettings({...emailSettings, lowStock: !emailSettings.lowStock})}
              />
              <NotificationToggle
                icon={TrendingUp}
                label="Изменение цен конкурентов"
                description="Мониторинг цен конкурентов"
                checked={emailSettings.priceChanges}
                onChange={() => setEmailSettings({...emailSettings, priceChanges: !emailSettings.priceChanges})}
              />
              <NotificationToggle
                icon={Star}
                label="Новые отзывы"
                description="Когда покупатели оставляют отзывы"
                checked={emailSettings.newReviews}
                onChange={() => setEmailSettings({...emailSettings, newReviews: !emailSettings.newReviews})}
              />
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Отчёты</h4>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <NotificationToggle
                  icon={Mail}
                  label="Еженедельный отчёт"
                  description="Каждый понедельник в 9:00"
                  checked={emailSettings.weeklyReport}
                  onChange={() => setEmailSettings({...emailSettings, weeklyReport: !emailSettings.weeklyReport})}
                />
                <NotificationToggle
                  icon={Mail}
                  label="Ежемесячный отчёт"
                  description="1-го числа каждого месяца"
                  checked={emailSettings.monthlyReport}
                  onChange={() => setEmailSettings({...emailSettings, monthlyReport: !emailSettings.monthlyReport})}
                />
              </div>
            </div>
          </motion.div>

          {/* Push Notifications */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Push уведомления</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Браузерные уведомления</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <NotificationToggle
                icon={ShoppingBag}
                label="Новые заказы"
                checked={pushSettings.newOrders}
                onChange={() => setPushSettings({...pushSettings, newOrders: !pushSettings.newOrders})}
              />
              <NotificationToggle
                icon={Package}
                label="Изменение статуса"
                checked={pushSettings.orderStatus}
                onChange={() => setPushSettings({...pushSettings, orderStatus: !pushSettings.orderStatus})}
              />
              <NotificationToggle
                icon={AlertTriangle}
                label="Низкие остатки"
                checked={pushSettings.lowStock}
                onChange={() => setPushSettings({...pushSettings, lowStock: !pushSettings.lowStock})}
              />
              <NotificationToggle
                icon={TrendingUp}
                label="Изменение цен"
                checked={pushSettings.priceChanges}
                onChange={() => setPushSettings({...pushSettings, priceChanges: !pushSettings.priceChanges})}
              />
              <NotificationToggle
                icon={Star}
                label="Новые отзывы"
                checked={pushSettings.newReviews}
                onChange={() => setPushSettings({...pushSettings, newReviews: !pushSettings.newReviews})}
              />
            </div>
          </motion.div>

          {/* Telegram Notifications */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  telegramConnected ? 'bg-[#0088cc]/10' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <MessageCircle className={`w-5 h-5 ${telegramConnected ? 'text-[#0088cc]' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Telegram</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {telegramConnected ? '@robo_market_bot' : 'Не подключён'}
                  </p>
                </div>
              </div>
              {telegramConnected ? (
                <button
                  onClick={() => setTelegramConnected(false)}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                >
                  Отключить
                </button>
              ) : (
                <button
                  onClick={() => setShowTelegramModal(true)}
                  className="px-4 py-2 bg-[#0088cc] text-white rounded-xl text-sm font-medium hover:bg-[#006699] transition-colors cursor-pointer"
                >
                  Подключить
                </button>
              )}
            </div>

            {telegramConnected && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <NotificationToggle
                  icon={ShoppingBag}
                  label="Новые заказы"
                  description="Мгновенные уведомления"
                  checked={telegramSettings.newOrders}
                  onChange={() => setTelegramSettings({...telegramSettings, newOrders: !telegramSettings.newOrders})}
                />
                <NotificationToggle
                  icon={Package}
                  label="Изменение статуса"
                  checked={telegramSettings.orderStatus}
                  onChange={() => setTelegramSettings({...telegramSettings, orderStatus: !telegramSettings.orderStatus})}
                />
                <NotificationToggle
                  icon={AlertTriangle}
                  label="Низкие остатки"
                  description="Критически низкий уровень"
                  checked={telegramSettings.lowStock}
                  onChange={() => setTelegramSettings({...telegramSettings, lowStock: !telegramSettings.lowStock})}
                />
                <NotificationToggle
                  icon={Mail}
                  label="Ежедневный отчёт"
                  description="Каждый день в 20:00"
                  checked={telegramSettings.dailyReport}
                  onChange={() => setTelegramSettings({...telegramSettings, dailyReport: !telegramSettings.dailyReport})}
                />
              </div>
            )}

            {!telegramConnected && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Получайте мгновенные уведомления прямо в Telegram
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Быстрее, чем email и push уведомления
                </p>
              </div>
            )}
          </motion.div>

          {/* Save Button */}
          <motion.div variants={itemVariants} className="flex justify-end">
            <button className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors cursor-pointer">
              Сохранить настройки
            </button>
          </motion.div>
        </motion.div>

        {/* Telegram Connect Modal */}
        <AnimatePresence>
          {showTelegramModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowTelegramModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                <div className="bg-[#0088cc] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Подключить Telegram</h3>
                    <button
                      onClick={() => setShowTelegramModal(false)}
                      className="text-white/80 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-[#0088cc]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-10 h-10 text-[#0088cc]" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      1. Откройте бота <span className="font-medium">@KaspiSellerBot</span> в Telegram
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      2. Нажмите "Start" и получите код
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      3. Введите код ниже:
                    </p>
                  </div>

                  <div className="mb-6">
                    <input
                      type="text"
                      value={telegramCode}
                      onChange={(e) => setTelegramCode(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-center text-lg tracking-widest focus:outline-none focus:border-[#0088cc] transition-colors dark:text-white"
                      placeholder="XXXXXX"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowTelegramModal(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleConnectTelegram}
                      disabled={telegramCode.length < 6}
                      className="flex-1 px-4 py-2.5 bg-[#0088cc] text-white rounded-xl font-medium hover:bg-[#006699] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" />
                        Подключить
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
