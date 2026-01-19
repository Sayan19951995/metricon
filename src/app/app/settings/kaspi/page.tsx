'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  ShoppingBag,
  Package,
  ChevronLeft,
  Loader2,
  Unlink,
  Link as LinkIcon,
  Settings,
  Calendar,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Mock синхронизированные данные
const syncStats = {
  lastSync: '18.01.2026, 14:32',
  ordersCount: 1245,
  productsCount: 156,
  revenue: 12500000,
};

const syncHistory = [
  { date: '18.01.2026, 14:32', status: 'success', message: 'Синхронизировано: 12 заказов, 3 товара' },
  { date: '18.01.2026, 10:15', status: 'success', message: 'Синхронизировано: 8 заказов' },
  { date: '17.01.2026, 22:00', status: 'success', message: 'Полная синхронизация завершена' },
  { date: '17.01.2026, 14:45', status: 'error', message: 'Ошибка авторизации, требуется повторный вход' },
  { date: '17.01.2026, 10:30', status: 'success', message: 'Синхронизировано: 15 заказов, 5 товаров' },
];

export default function KaspiSettingsPage() {
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [showPassword, setShowPassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const [credentials, setCredentials] = useState({
    login: '+7 (777) 123-45-67',
    password: ''
  });

  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: '30',
    syncOrders: true,
    syncProducts: true,
    syncPrices: true,
    syncStock: true,
  });

  const handleConnect = () => {
    setStatus('connecting');
    setTimeout(() => {
      setStatus('connected');
    }, 2000);
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 3000);
  };

  const handleDisconnect = () => {
    setStatus('disconnected');
    setShowDisconnectModal(false);
    setCredentials({ login: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к настройкам
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Подключение Kaspi</h1>
              <p className="text-gray-500 mt-1">Интеграция с кабинетом продавца Kaspi.kz</p>
            </div>
            <a
              href="https://kaspi.kz/mc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#f14635] text-white rounded-xl hover:bg-[#d93d2e] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Кабинет Kaspi
            </a>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Connection Status Card */}
          <motion.div variants={itemVariants} className={`rounded-2xl p-6 shadow-sm ${
            status === 'connected' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' :
            status === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
            'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  status === 'connected' || status === 'error' ? 'bg-white/20' : 'bg-[#f14635]/10'
                }`}>
                  <Store className={`w-7 h-7 ${
                    status === 'connected' || status === 'error' ? 'text-white' : 'text-[#f14635]'
                  }`} />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${
                    status === 'connected' || status === 'error' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {status === 'connected' && 'Kaspi подключён'}
                    {status === 'connecting' && 'Подключение...'}
                    {status === 'disconnected' && 'Kaspi не подключён'}
                    {status === 'error' && 'Ошибка подключения'}
                  </h2>
                  <p className={status === 'connected' || status === 'error' ? 'text-white/80' : 'text-gray-500'}>
                    {status === 'connected' && `Последняя синхронизация: ${syncStats.lastSync}`}
                    {status === 'connecting' && 'Проверяем данные авторизации...'}
                    {status === 'disconnected' && 'Подключите кабинет для загрузки данных'}
                    {status === 'error' && 'Проверьте данные авторизации'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {status === 'connected' && (
                  <>
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
                    </button>
                    <button
                      onClick={() => setShowDisconnectModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors cursor-pointer"
                    >
                      <Unlink className="w-4 h-4" />
                      Отключить
                    </button>
                  </>
                )}
                {status === 'connecting' && (
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                )}
              </div>
            </div>

            {/* Stats for connected state */}
            {status === 'connected' && (
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                <div className="text-center">
                  <div className="text-3xl font-bold">{syncStats.ordersCount.toLocaleString()}</div>
                  <div className="text-white/80 text-sm">Заказов</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{syncStats.productsCount}</div>
                  <div className="text-white/80 text-sm">Товаров</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{(syncStats.revenue / 1000000).toFixed(1)}M</div>
                  <div className="text-white/80 text-sm">Выручка ₸</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Login Form (for disconnected/error state) */}
          {(status === 'disconnected' || status === 'error') && (
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Данные для входа</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Логин (телефон или email)</label>
                  <input
                    type="text"
                    value={credentials.login}
                    onChange={(e) => setCredentials({...credentials, login: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Пароль от Kaspi</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors pr-10"
                      placeholder="Введите пароль"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Безопасность:</strong> Ваши данные используются только для автоматизированной загрузки через Playwright.
                    Мы не храним пароли в открытом виде и используем шифрование.
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={!credentials.login || !credentials.password}
                  className="w-full px-4 py-3 bg-[#f14635] text-white rounded-xl font-medium hover:bg-[#d93d2e] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Подключить Kaspi
                </button>
              </div>
            </motion.div>
          )}

          {/* Sync Settings */}
          {status === 'connected' && (
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">Настройки синхронизации</h3>
              </div>

              <div className="space-y-4">
                {/* Auto Sync Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">Автоматическая синхронизация</p>
                    <p className="text-sm text-gray-500">Загружать данные автоматически</p>
                  </div>
                  <button
                    onClick={() => setSyncSettings({...syncSettings, autoSync: !syncSettings.autoSync})}
                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                      syncSettings.autoSync ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      syncSettings.autoSync ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Sync Interval */}
                {syncSettings.autoSync && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Интервал синхронизации</p>
                      <p className="text-sm text-gray-500">Как часто обновлять данные</p>
                    </div>
                    <select
                      value={syncSettings.syncInterval}
                      onChange={(e) => setSyncSettings({...syncSettings, syncInterval: e.target.value})}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm cursor-pointer"
                    >
                      <option value="15">Каждые 15 минут</option>
                      <option value="30">Каждые 30 минут</option>
                      <option value="60">Каждый час</option>
                      <option value="180">Каждые 3 часа</option>
                    </select>
                  </div>
                )}

                {/* What to sync */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-900 mb-3">Что синхронизировать</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'syncOrders', label: 'Заказы', icon: ShoppingBag },
                      { key: 'syncProducts', label: 'Товары', icon: Package },
                      { key: 'syncPrices', label: 'Цены', icon: TrendingUp },
                      { key: 'syncStock', label: 'Остатки', icon: Package },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={syncSettings[item.key as keyof typeof syncSettings] as boolean}
                          onChange={(e) => setSyncSettings({...syncSettings, [item.key]: e.target.checked})}
                          className="w-4 h-4 text-emerald-500 rounded cursor-pointer"
                        />
                        <item.icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Sync History */}
          {status === 'connected' && (
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">История синхронизации</h3>
              </div>
              <div className="space-y-3">
                {syncHistory.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {item.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{item.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Disconnect Modal */}
        <AnimatePresence>
          {showDisconnectModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDisconnectModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Отключить Kaspi?</h3>
                  <p className="text-gray-500">
                    Синхронизация данных будет остановлена. Ранее загруженные данные останутся в системе.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDisconnectModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    Отключить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
