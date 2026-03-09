'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Search, Send, ToggleLeft, ToggleRight, Phone, Store, CheckCircle, XCircle, Wifi, WifiOff, Loader2, Bell, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
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

  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingPhone, setPairingPhone] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const connectingRef = useRef(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const [notifPhone, setNotifPhone] = useState('');
  const [savingNotifPhone, setSavingNotifPhone] = useState(false);
  const [notifPhoneSaved, setNotifPhoneSaved] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);
  const [notifTestResult, setNotifTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [testModal, setTestModal] = useState<StoreItem | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<Array<{ ts: number; level: string; msg: string }>>([]);
  const [logsOpen, setLogsOpen] = useState(true);
  const logsSinceRef = useRef(0);
  const logsPollRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Periodic status check ref (separate from QR polling)
  const statusPollRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchLogs() {
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logs', since: logsSinceRef.current }),
      });
      const data = await res.json();
      if (data.logs?.length > 0) {
        setLogs(prev => {
          const merged = [...prev, ...data.logs];
          return merged.slice(-200); // keep last 200
        });
        logsSinceRef.current = data.logs[data.logs.length - 1].ts;
        // Auto-scroll
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadStores();
    loadNotifPhone();
    fetchLogs();

    // Poll logs every 5s
    logsPollRef.current = setInterval(fetchLogs, 5000);

    // Poll WA status every 30s to detect disconnects
    statusPollRef.current = setInterval(async () => {
      try {
        const res = await fetchWithAuth('/api/admin/whatsapp', {
          method: 'PATCH',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status' }),
        });
        const data = await res.json();
        // Only update status to connected/disconnected/server_offline
        // Don't let stale code_pending/qr_pending from server overwrite UI state
        const status = data.status || 'disconnected';
        if (status === 'connected' || status === 'disconnected' || status === 'server_offline') {
          setWaStatus(status);
          if (status === 'connected') setPairingCode(null);
        }
      } catch {
        setWaStatus('server_offline');
      }
    }, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      if (logsPollRef.current) clearInterval(logsPollRef.current);
    };
  }, []);

  async function loadNotifPhone() {
    try {
      const res = await fetchWithAuth('/api/admin/settings');
      const data = await res.json();
      if (data.success) setNotifPhone(data.settings.notification_phone || '');
    } catch { /* ignore */ }
  }

  async function saveNotifPhone() {
    setSavingNotifPhone(true);
    setNotifTestResult(null);
    try {
      const res = await fetchWithAuth('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_phone: notifPhone }),
      });
      if (res.ok) {
        setNotifPhoneSaved(true);
        setTimeout(() => setNotifPhoneSaved(false), 2000);
      } else {
        setNotifTestResult({ ok: false, msg: `Ошибка сохранения (${res.status})` });
      }
    } catch (e: any) {
      setNotifTestResult({ ok: false, msg: `Ошибка: ${e.message}` });
    } finally {
      setSavingNotifPhone(false);
    }
  }

  async function handleTestNotifPhone() {
    setTestingNotif(true);
    setNotifTestResult(null);
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_notif_phone' }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifTestResult({ ok: true, msg: `Тест отправлен на ${data.phone}` });
      } else {
        setNotifTestResult({ ok: false, msg: data.error || 'Неизвестная ошибка' });
        // Refresh WA status
        try {
          const statusRes = await fetchWithAuth('/api/admin/whatsapp', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status' }),
          });
          const statusData = await statusRes.json();
          setWaStatus(statusData.status || 'disconnected');
        } catch { setWaStatus('server_offline'); }
      }
    } catch (e: any) {
      setNotifTestResult({ ok: false, msg: `Ошибка: ${e.message}` });
      setWaStatus('server_offline');
    } finally {
      setTestingNotif(false);
    }
  }

  async function loadStores() {
    try {
      const res = await fetchWithAuth(`/api/admin/whatsapp?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setStores(data.stores || []);
      // Don't overwrite state if a connect is in progress (race condition on slow networks)
      if (!connectingRef.current) {
        const status = data.waStatus || 'disconnected';
        if (status === 'connected' || status === 'disconnected' || status === 'server_offline') {
          setWaStatus(status);
        } else {
          setWaStatus('disconnected');
        }
        setPairingCode(data.pairingCode || null);
      }
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!pairingPhone) return;
    setConnecting(true);
    connectingRef.current = true;
    setPairingCode(null);
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', pairingPhone }),
      });
      const data = await res.json();
      console.log('[WA PAGE] connect response:', data);
      setWaStatus(data.status || 'connecting');
      setWaQr(data.qr || null);
      setPairingCode(data.pairingCode || null);
      // Start polling only AFTER we got the response (so poll doesn't overwrite pairingCode)
      if (data.status !== 'connected') startPolling();
    } catch (e) {
      console.error('Connect error:', e);
    } finally {
      setConnecting(false);
      connectingRef.current = false;
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

  async function handleForceReconnect() {
    if (!pairingPhone) return;
    setConnecting(true);
    connectingRef.current = true;
    setWaQr(null);
    setPairingCode(null);
    setWaStatus('connecting');
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_reconnect', pairingPhone }),
      });
      const data = await res.json();
      console.log('[WA PAGE] force_reconnect response:', data);
      setWaStatus(data.status || 'connecting');
      setWaQr(data.qr || null);
      setPairingCode(data.pairingCode || null);
      if (data.status !== 'connected') startPolling();
    } catch (e) {
      console.error('Force reconnect error:', e);
    } finally {
      setConnecting(false);
      connectingRef.current = false;
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
        // Don't overwrite existing pairingCode with null from status poll
        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
        }
        if (data.status === 'connected') { stopPolling(); setPairingCode(null); }
        if (data.status === 'disconnected') { stopPolling(); }
      } catch { /* ignore */ }
    }, 5000);
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
    setSendError(null);
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test', storeId: testModal.id, phone: testPhone, message: testMessage }),
      });
      const data = await res.json();
      setSendResult(data.success ? 'success' : 'error');
      if (!data.success) {
        setSendError(data.error || 'Неизвестная ошибка');
        // Refresh WA status — session may have disconnected
        try {
          const statusRes = await fetchWithAuth('/api/admin/whatsapp', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status' }),
          });
          const statusData = await statusRes.json();
          setWaStatus(statusData.status || 'disconnected');
          setWaQr(statusData.qr || null);
        } catch { setWaStatus('server_offline'); }
      }
    } catch (e: any) {
      setSendResult('error');
      setSendError(e.message || 'Сеть недоступна');
      setWaStatus('server_offline');
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
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MessageCircle className="w-7 h-7 text-green-400" />
          WhatsApp рассылка
        </h1>
        <p className="text-gray-400 mt-1">Управление WhatsApp уведомлениями для магазинов</p>
      </div>

      {/* Notification Phone */}
      <div className="bg-gray-800/80 rounded-2xl p-6 mb-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-yellow-400" />
          Уведомления об оплате
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Номер WhatsApp, на который приходят заявки на оплату от клиентов.
        </p>
        <div className="flex gap-3">
          <input
            type="tel"
            value={notifPhone}
            onChange={e => setNotifPhone(e.target.value)}
            placeholder="+7XXXXXXXXXX"
            className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
          />
          <button
            onClick={saveNotifPhone}
            disabled={savingNotifPhone}
            className="px-5 py-2.5 bg-yellow-600 text-white rounded-xl text-sm font-medium hover:bg-yellow-500 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {notifPhoneSaved ? <CheckCircle className="w-4 h-4" /> : savingNotifPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {notifPhoneSaved ? 'Сохранено' : 'Сохранить'}
          </button>
          <button
            onClick={handleTestNotifPhone}
            disabled={testingNotif || waStatus !== 'connected'}
            title="Отправить тестовое WA сообщение на сохранённый номер"
            className="px-4 py-2.5 bg-gray-700 text-gray-200 border border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-2"
          >
            {testingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Тест
          </button>
        </div>
        {notifTestResult && (
          <p className={`mt-2 text-sm font-medium flex items-center gap-1.5 ${notifTestResult.ok ? 'text-green-400' : 'text-red-400'}`}>
            {notifTestResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {notifTestResult.msg}
          </p>
        )}
      </div>

      {/* WA Session Block */}
      <div className="bg-gray-800/80 rounded-2xl p-6 mb-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {waStatus === 'connected' ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            Сессия WhatsApp
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
            waStatus === 'connected'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : waStatus === 'server_offline'
                ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                : connecting || pairingCode
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                  : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}>
            {(connecting || pairingCode) && <Loader2 className="w-3 h-3 animate-spin" />}
            {waStatus === 'connected' ? 'Подключён' : waStatus === 'server_offline' ? 'Сервер недоступен' : connecting ? 'Подключение...' : pairingCode ? 'Ожидание кода' : 'Отключён'}
          </span>
        </div>

        {waStatus === 'connected' ? (
          <div className="flex items-center justify-between">
            <p className="text-gray-300 text-sm">WhatsApp подключён и готов к отправке.</p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 bg-red-900/40 text-red-300 border border-red-700 rounded-xl text-sm font-medium hover:bg-red-900/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              {disconnecting ? 'Отключение...' : 'Отключить'}
            </button>
          </div>
        ) : pairingCode ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-300 text-sm">Введите этот код в WhatsApp на телефоне:</p>
            <div className="bg-gray-900 border border-gray-600 rounded-2xl px-8 py-5">
              <div className="text-4xl font-mono font-bold text-white tracking-[0.3em] text-center">
                {pairingCode.slice(0, 4)}-{pairingCode.slice(4)}
              </div>
            </div>
            <p className="text-gray-500 text-xs text-center max-w-sm">
              Откройте WhatsApp → Связанные устройства → Связать устройство → Связать по номеру телефона → введите код выше
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Ожидание подключения...
              </div>
              <button
                onClick={() => { setPairingCode(null); stopPolling(); handleConnect(); }}
                disabled={connecting}
                className="px-4 py-2 bg-gray-700 text-gray-200 border border-gray-600 rounded-xl text-xs font-medium hover:bg-gray-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                Новый код
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              {waStatus === 'server_offline' ? 'WhatsApp сервер недоступен.' : waStatus === 'connecting' || waStatus === 'code_pending' ? 'Подключение...' : 'Введите номер WhatsApp для привязки.'}
            </p>
            <div className="flex gap-3">
              <input
                type="tel"
                value={pairingPhone}
                onChange={e => setPairingPhone(e.target.value)}
                placeholder="+7 XXX XXX XXXX"
                className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
              <button
                onClick={handleConnect}
                disabled={connecting || !pairingPhone || waStatus === 'server_offline'}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-500 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {connecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Подключение...</>
                ) : (
                  <><Phone className="w-4 h-4" /> Подключить</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Всего магазинов</div>
          <div className="text-2xl font-bold text-white mt-1">{stores.length}</div>
        </div>
        <div className="bg-gray-800/80 rounded-xl p-4 border border-green-800">
          <div className="text-green-400 text-sm font-medium">Рассылка включена</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{connectedCount}</div>
        </div>
        <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Рассылка выключена</div>
          <div className="text-2xl font-bold text-gray-300 mt-1">{stores.length - connectedCount}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'on', 'off'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
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
        <div className="bg-gray-800/80 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Магазин</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Владелец</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Телефон</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">WA</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(store => (
                  <tr key={store.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{store.name || '—'}</div>
                          <div className="text-xs text-gray-500 md:hidden">{store.owner_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-gray-200">{store.owner_name}</div>
                      <div className="text-xs text-gray-500">{store.owner_email}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
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
                          <ToggleRight className="w-8 h-8 text-green-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-600" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openTestModal(store)}
                        disabled={waStatus !== 'connected'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 text-green-300 border border-green-800 rounded-lg text-xs font-medium hover:bg-green-900/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* Server Logs */}
      <div className="bg-gray-800/80 rounded-2xl border border-gray-700 mt-6 overflow-hidden">
        <button
          onClick={() => setLogsOpen(!logsOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-700/30 transition-colors cursor-pointer"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-gray-400" />
            Логи WA сервера
            <span className="text-xs text-gray-500 font-normal ml-2">{logs.length} записей</span>
          </h2>
          {logsOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {logsOpen && (
          <div className="px-4 pb-4">
            <div className="bg-gray-950 rounded-xl border border-gray-700 max-h-80 overflow-y-auto font-mono text-xs p-3 space-y-0.5">
              {logs.length === 0 ? (
                <div className="text-gray-600 py-4 text-center">Нет логов</div>
              ) : (
                logs.map((log, i) => (
                  <div key={`${log.ts}-${i}`} className="flex gap-2">
                    <span className="text-gray-600 flex-shrink-0">
                      {new Date(log.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={log.level === 'error' ? 'text-red-400' : log.msg.includes('Connected') ? 'text-green-400' : log.msg.includes('Disconnected') ? 'text-yellow-400' : 'text-gray-300'}>
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Test Message Modal */}
      {testModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setTestModal(null)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Тестовое сообщение</h3>
            <p className="text-sm text-gray-400 mb-4">{testModal.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-green-500"
                  placeholder="+7XXXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Сообщение</label>
                <textarea
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {sendResult && (
                <div className={`text-sm font-medium ${sendResult === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  <div className="flex items-center gap-2">
                    {sendResult === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {sendResult === 'success' ? 'Сообщение отправлено' : 'Ошибка отправки'}
                  </div>
                  {sendError && <div className="mt-1 text-xs text-red-400/70 font-normal">{sendError}</div>}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setTestModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
                <button
                  onClick={handleSendTest}
                  disabled={sending || !testPhone || !testMessage}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-500 transition-colors cursor-pointer disabled:opacity-50"
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
