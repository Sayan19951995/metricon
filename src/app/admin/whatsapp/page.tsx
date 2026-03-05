'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Search, Send, ToggleLeft, ToggleRight, Phone, Store, CheckCircle, XCircle, Wifi, WifiOff, QrCode, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface StoreItem {
  id: string;
  name: string;
  kaspi_merchant_id: string | null;
  whatsapp_connected: boolean;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
}

export default function AdminWhatsAppPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all');
  const [toggling, setToggling] = useState<string | null>(null);

  // WA session
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Test message modal
  const [testModal, setTestModal] = useState<StoreItem | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    loadStores();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadStores() {
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp');
      const data = await res.json();
      setStores(data.stores || []);
      setWaStatus(data.waStatus || 'disconnected');
      setWaQr(data.waQr || null);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' }),
      });
      const data = await res.json();
      setWaStatus(data.status || 'disconnected');
      setWaQr(data.qr || null);
      if (data.status !== 'connected') startPolling();
    } catch (e) {
      console.error('Connect error:', e);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      setWaStatus('disconnected');
      setWaQr(null);
      stopPolling();
    } catch (e) {
      console.error('Disconnect error:', e);
    } finally {
      setDisconnecting(false);
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetchWithAuth('/api/admin/whatsapp', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status' }),
        });
        const data = await res.json();
        setWaStatus(data.status || 'disconnected');
        setWaQr(data.qr || null);
        if (data.status === 'connected') stopPolling();
      } catch { /* ignore */ }
    }, 3000);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function handleToggle(storeId: string) {
    setToggling(storeId);
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', storeId }),
      });
      const data = await res.json();
      if (data.success) {
        setStores(prev => prev.map(s =>
          s.id === storeId ? { ...s, whatsapp_connected: data.whatsapp_connected } : s
        ));
      }
    } catch (e) {
      console.error('Toggle error:', e);
    } finally {
      setToggling(null);
    }
  }

  async function handleSendTest() {
    if (!testModal || !testPhone || !testMessage) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test', storeId: testModal.id, phone: testPhone, message: testMessage }),
      });
      const data = await res.json();
      setSendResult(data.success ? 'success' : 'error');
    } catch {
      setSendResult('error');
    } finally {
      setSending(false);
    }
  }

  function openTestModal(store: StoreItem) {
    setTestModal(store);
    setTestPhone(store.owner_phone);
    setTestMessage(`Тест от Metricon для ${store.name}`);
    setSendResult(null);
  }

  const filtered = stores.filter(s => {
    if (filter === 'on' && !s.whatsapp_connected) return false;
    if (filter === 'off' && s.whatsapp_connected) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.owner_name?.toLowerCase().includes(q) || s.owner_email?.toLowerCase().includes(q) || s.owner_phone?.includes(q);
    }
    return true;
  });

  const connectedCount = stores.filter(s => s.whatsapp_connected).length;

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <MessageCircle className="w-7 h-7 text-green-500" />
          WhatsApp рассылка
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Управление WhatsApp уведомлениями для магазинов</p>
      </div>

      {/* WA Session Block */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {waStatus === 'connected' ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            Сессия WhatsApp
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            waStatus === 'connected'
              ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
              : waStatus === 'server_offline'
                ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
          }`}>
            {waStatus === 'connected' ? 'Подключён' : waStatus === 'server_offline' ? 'Сервер недоступен' : 'Отключён'}
          </span>
        </div>

        {waStatus === 'connected' ? (
          <div className="flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400 text-sm">WhatsApp подключён и готов к отправке.</p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              {disconnecting ? 'Отключение...' : 'Отключить'}
            </button>
          </div>
        ) : waQr ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Отсканируйте QR-код в WhatsApp:</p>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(waQr)}`} alt="QR" className="w-64 h-64" />
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Ожидание сканирования...
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {waStatus === 'server_offline' ? 'WhatsApp сервер (Railway) недоступен.' : 'Подключите WhatsApp для отправки уведомлений.'}
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {connecting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Подключение...</>
              ) : (
                <><QrCode className="w-4 h-4" /> Подключить</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-gray-500 dark:text-gray-400 text-sm">Всего магазинов</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stores.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-green-200 dark:border-green-800 shadow-sm">
          <div className="text-green-600 dark:text-green-400 text-sm">Рассылка включена</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{connectedCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-gray-500 dark:text-gray-400 text-sm">Рассылка выключена</div>
          <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">{stores.length - connectedCount}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'on', 'off'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                filter === f
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'on' ? 'Включены' : 'Выключены'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Магазины не найдены</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Магазин</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Владелец</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Телефон</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">WA</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(store => (
                  <tr key={store.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{store.name || '—'}</div>
                          <div className="text-xs text-gray-500 md:hidden">{store.owner_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-gray-700 dark:text-gray-200">{store.owner_name}</div>
                      <div className="text-xs text-gray-500">{store.owner_email}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {store.owner_phone || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(store.id)}
                        disabled={toggling === store.id}
                        className="inline-flex items-center cursor-pointer disabled:opacity-50"
                      >
                        {store.whatsapp_connected ? (
                          <ToggleRight className="w-8 h-8 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openTestModal(store)}
                        disabled={waStatus !== 'connected'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-500/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Тест
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test Message Modal */}
      {testModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setTestModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Тестовое сообщение</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{testModal.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-green-500"
                  placeholder="+7XXXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Сообщение</label>
                <textarea
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {sendResult && (
                <div className={`flex items-center gap-2 text-sm font-medium ${sendResult === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {sendResult === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {sendResult === 'success' ? 'Сообщение отправлено' : 'Ошибка отправки'}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setTestModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
                <button
                  onClick={handleSendTest}
                  disabled={sending || !testPhone || !testMessage}
                  className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {sending ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
