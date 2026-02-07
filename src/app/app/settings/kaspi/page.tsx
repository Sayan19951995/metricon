'use client';

import { useState, useEffect } from 'react';
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
  ChevronLeft,
  Loader2,
  Unlink,
  Settings,
  Key,
  Copy,
  Check,
  LogIn,
  Plug,
  PlugZap,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import BrandLoader from '@/components/ui/BrandLoader';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.15 }
  }
};

interface SyncHistoryItem {
  date: string;
  status: 'success' | 'error';
  message: string;
}

export default function KaspiSettingsPage() {
  const { user, store, loading: userLoading } = useUser();

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [credentials, setCredentials] = useState({
    apiKey: '',
    merchantId: '',
    storeName: ''
  });

  const [syncStats, setSyncStats] = useState({
    lastSync: '',
    ordersCount: 0,
    productsCount: 0,
    revenue: 0,
  });

  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);

  // Диагностика API
  const [debugData, setDebugData] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // Кабинет Kaspi
  const [cabinetConnected, setCabinetConnected] = useState(false);
  const [cabinetUsername, setCabinetUsername] = useState('');
  const [cabinetConnectedAt, setCabinetConnectedAt] = useState('');
  const [cabinetLoading, setCabinetLoading] = useState(false);

  // Форма входа в кабинет
  const [cabinetCreds, setCabinetCreds] = useState({ username: '', password: '' });
  const [cabinetLoginLoading, setCabinetLoginLoading] = useState(false);
  const [cabinetLoginError, setCabinetLoginError] = useState('');
  const [showCabinetForm, setShowCabinetForm] = useState(false);
  const [showCabinetPassword, setShowCabinetPassword] = useState(false);

  // Проверяем статус подключения при загрузке
  useEffect(() => {
    if (user?.id) {
      checkConnectionStatus();
      checkCabinetStatus();
    }
  }, [user?.id]);

  const checkConnectionStatus = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/kaspi/connect?userId=${user.id}`);
      const data = await response.json();

      if (data.connected) {
        setStatus('connected');
        // Загружаем статистику
        loadStats();
      } else {
        setStatus('disconnected');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/kaspi/sync?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setSyncStats({
          lastSync: new Date().toLocaleString('ru-RU'),
          ordersCount: data.stats.ordersCount,
          productsCount: data.stats.productsCount,
          revenue: data.stats.totalRevenue,
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleConnect = async () => {
    if (!user?.id || !credentials.apiKey || !credentials.merchantId) {
      setError('Заполните все поля');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const response = await fetch('/api/kaspi/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          apiKey: credentials.apiKey,
          merchantId: credentials.merchantId,
          storeName: credentials.storeName || 'Мой магазин'
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('connected');
        setSyncHistory(prev => [{
          date: new Date().toLocaleString('ru-RU'),
          status: 'success',
          message: 'Kaspi успешно подключен'
        }, ...prev]);

        // Запускаем первую синхронизацию
        handleSync();
      } else {
        setStatus('error');
        setError(data.message);
        setSyncHistory(prev => [{
          date: new Date().toLocaleString('ru-RU'),
          status: 'error',
          message: data.message
        }, ...prev]);
      }
    } catch (err) {
      setStatus('error');
      setError('Ошибка подключения');
    }
  };

  const handleSync = async () => {
    if (!user?.id) return;

    setIsSyncing(true);

    try {
      const response = await fetch('/api/kaspi/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          daysBack: 14
        })
      });

      const data = await response.json();

      if (data.success) {
        setSyncHistory(prev => [{
          date: new Date().toLocaleString('ru-RU'),
          status: 'success',
          message: `Синхронизировано: ${data.stats.ordersCreated} новых заказов, ${data.stats.productsCreated} товаров`
        }, ...prev.slice(0, 9)]);

        // Обновляем статистику
        loadStats();
      } else {
        setSyncHistory(prev => [{
          date: new Date().toLocaleString('ru-RU'),
          status: 'error',
          message: data.message
        }, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      setSyncHistory(prev => [{
        date: new Date().toLocaleString('ru-RU'),
        status: 'error',
        message: 'Ошибка синхронизации'
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/kaspi/connect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('disconnected');
        setShowDisconnectModal(false);
        setCredentials({ apiKey: '', merchantId: '', storeName: '' });
        setSyncStats({ lastSync: '', ordersCount: 0, productsCount: 0, revenue: 0 });
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleDebugApi = async () => {
    if (!user?.id) return;
    setDebugLoading(true);
    setDebugData(null);

    try {
      const response = await fetch(`/api/kaspi/debug?userId=${user.id}`);
      const data = await response.json();
      setDebugData(data);
    } catch (err) {
      setDebugData({ error: 'Ошибка запроса: ' + (err instanceof Error ? err.message : 'Unknown') });
    } finally {
      setDebugLoading(false);
    }
  };

  const copyMerchantId = () => {
    navigator.clipboard.writeText(credentials.merchantId || store?.kaspi_merchant_id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkCabinetStatus = async () => {
    if (!user?.id) return;
    setCabinetLoading(true);
    try {
      const res = await fetch(`/api/kaspi/cabinet/session?userId=${user.id}`);
      const data = await res.json();
      setCabinetConnected(data.connected || false);
      setCabinetUsername(data.username || '');
      setCabinetConnectedAt(data.connectedAt || '');
    } catch {
      setCabinetConnected(false);
    } finally {
      setCabinetLoading(false);
    }
  };

  const disconnectCabinet = async () => {
    if (!user?.id) return;
    try {
      await fetch(`/api/kaspi/cabinet/session?userId=${user.id}`, { method: 'DELETE' });
      setCabinetConnected(false);
      setCabinetUsername('');
      setCabinetConnectedAt('');
    } catch (err) {
      console.error('Disconnect cabinet error:', err);
    }
  };

  const handleCabinetLogin = async () => {
    if (!user?.id) return;
    setCabinetLoginLoading(true);
    setCabinetLoginError('');

    try {
      if (!cabinetCreds.username || !cabinetCreds.password) {
        setCabinetLoginError('Заполните логин и пароль');
        setCabinetLoginLoading(false);
        return;
      }

      const res = await fetch('/api/kaspi/cabinet/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: cabinetCreds.username,
          password: cabinetCreds.password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCabinetConnected(true);
        setCabinetUsername(cabinetCreds.username);
        setCabinetConnectedAt(new Date().toISOString());
        setShowCabinetForm(false);
        setCabinetCreds({ username: '', password: '' });
      } else {
        setCabinetLoginError(data.error || 'Не удалось войти');
      }
    } catch {
      setCabinetLoginError('Ошибка соединения');
    } finally {
      setCabinetLoginLoading(false);
    }
  };

  if (userLoading) {
    return <BrandLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к настройкам
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Подключение Kaspi</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Интеграция с Kaspi Merchant API</p>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Connection Status Card */}
          <div className={`rounded-2xl p-6 shadow-sm ${
            status === 'connected' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' :
            status === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
            'bg-white dark:bg-gray-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  status === 'connected' || status === 'error' ? 'bg-white/20' : 'bg-[#f14635]/10 dark:bg-[#f14635]/20'
                }`}>
                  <Store className={`w-6 h-6 sm:w-7 sm:h-7 ${
                    status === 'connected' || status === 'error' ? 'text-white' : 'text-[#f14635]'
                  }`} />
                </div>
                <div className="min-w-0">
                  <h2 className={`text-lg sm:text-xl font-bold ${
                    status === 'connected' || status === 'error' ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}>
                    {status === 'connected' && 'Kaspi API подключён'}
                    {status === 'connecting' && 'Подключение...'}
                    {status === 'disconnected' && 'Kaspi API не подключён'}
                    {status === 'error' && 'Ошибка подключения'}
                  </h2>
                  <p className={`text-sm ${status === 'connected' || status === 'error' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                    {status === 'connected' && syncStats.lastSync && `Синхронизация: ${syncStats.lastSync}`}
                    {status === 'connecting' && 'Проверяем API ключ...'}
                    {status === 'disconnected' && 'Введите API ключ для подключения'}
                    {status === 'error' && (error || 'Проверьте API ключ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {status === 'connected' && (
                  <>
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Синхр...' : 'Синхр.'}</span>
                    </button>
                    <button
                      onClick={() => setShowDisconnectModal(true)}
                      className="flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors cursor-pointer"
                      title="Отключить"
                    >
                      <Unlink className="w-4 h-4" />
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
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/20">
                <div className="text-center">
                  <div className="text-xl sm:text-3xl font-bold">{syncStats.ordersCount.toLocaleString()}</div>
                  <div className="text-white/80 text-xs sm:text-sm">Заказов</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-3xl font-bold">{syncStats.productsCount}</div>
                  <div className="text-white/80 text-xs sm:text-sm">Товаров</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-3xl font-bold">{(syncStats.revenue / 1000000).toFixed(1)}M</div>
                  <div className="text-white/80 text-xs sm:text-sm">Выручка ₸</div>
                </div>
              </div>
            )}
          </div>

          {/* API Key Form (for disconnected/error state) */}
          {(status === 'disconnected' || status === 'error') && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Данные для подключения</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Merchant ID (ID продавца)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={credentials.merchantId}
                      onChange={(e) => setCredentials({...credentials, merchantId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 transition-colors pr-10"
                      placeholder="Например: 123456"
                    />
                    <button
                      type="button"
                      onClick={copyMerchantId}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API ключ
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={credentials.apiKey}
                      onChange={(e) => setCredentials({...credentials, apiKey: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 transition-colors pr-10"
                      placeholder="Введите API ключ из кабинета Kaspi"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название магазина (опционально)
                  </label>
                  <input
                    type="text"
                    value={credentials.storeName}
                    onChange={(e) => setCredentials({...credentials, storeName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Мой магазин"
                    style={{ color: 'inherit' }}
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">
                        Где взять API ключ?
                      </p>
                      <ol className="text-sm text-blue-700 dark:text-blue-400 list-decimal list-inside space-y-1">
                        <li>Зайдите в <a href="https://kaspi.kz/mc" target="_blank" rel="noopener noreferrer" className="underline">Кабинет продавца Kaspi</a></li>
                        <li>Перейдите в раздел "Настройки" → "API"</li>
                        <li>Создайте новый API ключ или скопируйте существующий</li>
                        <li>Скопируйте Merchant ID из профиля</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={!credentials.apiKey || !credentials.merchantId}
                  className="w-full px-4 py-3 bg-[#f14635] text-white rounded-xl font-medium hover:bg-[#d93d2e] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Подключить Kaspi
                </button>
              </div>
            </div>
          )}

          {/* Cabinet Connection */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              {cabinetConnected ? (
                <PlugZap className="w-5 h-5 text-emerald-500" />
              ) : (
                <Plug className="w-5 h-5 text-gray-400" />
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Кабинет Kaspi</h3>
            </div>

            <div className={`p-4 rounded-xl ${
              cabinetConnected
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                : 'bg-gray-50 dark:bg-gray-700'
            }`}>
              {cabinetLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Проверка...</span>
                </div>
              ) : cabinetConnected ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-emerald-800 dark:text-emerald-300">Кабинет подключён</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {cabinetUsername}
                      </p>
                      {cabinetConnectedAt && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {new Date(cabinetConnectedAt).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={disconnectCabinet}
                    className="self-end sm:self-auto px-3 py-1.5 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors cursor-pointer flex-shrink-0"
                  >
                    Отключить
                  </button>
                </div>
              ) : !showCabinetForm ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">Кабинет не подключён</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Для управления ценами и остатками
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCabinetForm(true)}
                    className="self-end sm:self-auto px-3 py-1.5 bg-[#f14635] text-white rounded-lg text-sm font-medium hover:bg-[#d93d2e] transition-colors cursor-pointer inline-flex items-center gap-1.5 flex-shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Подключить
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Форма логина */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Логин (телефон или email)
                      </label>
                      <input
                        type="text"
                        value={cabinetCreds.username}
                        onChange={(e) => setCabinetCreds({ ...cabinetCreds, username: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#f14635] transition-colors"
                        placeholder="+7 (XXX) XXX-XX-XX"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Пароль
                      </label>
                      <div className="relative">
                        <input
                          type={showCabinetPassword ? 'text' : 'password'}
                          value={cabinetCreds.password}
                          onChange={(e) => setCabinetCreds({ ...cabinetCreds, password: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#f14635] transition-colors pr-10"
                          placeholder="Пароль от кабинета Kaspi"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCabinetPassword(!showCabinetPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                        >
                          {showCabinetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  {cabinetLoginError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-xs text-red-700 dark:text-red-400">{cabinetLoginError}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowCabinetForm(false); setCabinetLoginError(''); }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleCabinetLogin}
                      disabled={cabinetLoginLoading}
                      className="flex-1 px-4 py-2 bg-[#f14635] text-white rounded-lg text-sm font-medium hover:bg-[#d93d2e] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {cabinetLoginLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Подключение...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          Войти в кабинет
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Кабинет используется для изменения цен, остатков и предзаказов напрямую на Kaspi.
              API ключ даёт только чтение данных.
            </p>
          </div>

          {/* API Debug - всегда видно */}
          {user?.id && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Диагностика API</h3>
                </div>
                <button
                  onClick={handleDebugApi}
                  disabled={debugLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {debugLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    'Выгрузить данные API'
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Покажет сырые ответы Kaspi API: заказы, entries (товары), relationships
              </p>

              {debugData && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-auto max-h-[600px]">
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                    {JSON.stringify(debugData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Sync History */}
          {status === 'connected' && syncHistory.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">История синхронизации</h3>
              </div>
              <div className="space-y-3">
                {syncHistory.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {item.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{item.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Отключить Kaspi?</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Синхронизация данных будет остановлена. Ранее загруженные данные останутся в системе.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDisconnectModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
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
