'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Search, Send, ToggleLeft, ToggleRight, Phone, Store, User, CheckCircle, XCircle } from 'lucide-react';
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

  // Test message modal
  const [testModal, setTestModal] = useState<StoreItem | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      const res = await fetchWithAuth('/api/admin/whatsapp');
      const data = await res.json();
      setStores(data.stores || []);
    } catch (e) {
      console.error('Load stores error:', e);
    } finally {
      setLoading(false);
    }
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
        body: JSON.stringify({
          action: 'send_test',
          storeId: testModal.id,
          phone: testPhone,
          message: testMessage,
        }),
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
      return (
        s.name?.toLowerCase().includes(q) ||
        s.owner_name?.toLowerCase().includes(q) ||
        s.owner_email?.toLowerCase().includes(q) ||
        s.owner_phone?.includes(q)
      );
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
        <p className="text-white/50 mt-1">Управление WhatsApp уведомлениями для магазинов</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/50 text-sm">Всего магазинов</div>
          <div className="text-2xl font-bold text-white mt-1">{stores.length}</div>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="text-green-400 text-sm">WA подключено</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{connectedCount}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/50 text-sm">Без WA</div>
          <div className="text-2xl font-bold text-white mt-1">{stores.length - connectedCount}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-green-500/50"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'on', 'off'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'on' ? 'Подключены' : 'Отключены'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-white/50">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/50">Магазины не найдены</div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase">Магазин</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase hidden md:table-cell">Владелец</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase hidden lg:table-cell">Телефон</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-white/40 uppercase">WA</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-white/40 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(store => (
                  <tr key={store.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-white/60" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{store.name || '—'}</div>
                          <div className="text-xs text-white/40 md:hidden">{store.owner_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-white/80">{store.owner_name}</div>
                      <div className="text-xs text-white/40">{store.owner_email}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-white/60">
                        <Phone className="w-3.5 h-3.5" />
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
                          <ToggleLeft className="w-8 h-8 text-white/30" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openTestModal(store)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setTestModal(null)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Тестовое сообщение</h3>
            <p className="text-sm text-white/50 mb-4">{testModal.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/50"
                  placeholder="+7XXXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Сообщение</label>
                <textarea
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/50 resize-none"
                />
              </div>

              {sendResult && (
                <div className={`flex items-center gap-2 text-sm ${sendResult === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {sendResult === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {sendResult === 'success' ? 'Сообщение отправлено' : 'Ошибка отправки'}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setTestModal(null)}
                  className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors cursor-pointer"
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
