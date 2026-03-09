'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { CheckCircle, XCircle, Clock, CreditCard, Phone, User, Calendar, ChevronDown } from 'lucide-react';

interface PaymentRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  price: number;
  kaspi_phone: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<string, { text: string; class: string }> = {
  pending:   { text: 'Ожидает',     class: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700' },
  confirmed: { text: 'Подтверждён', class: 'bg-green-900/40 text-green-300 border border-green-700' },
  rejected:  { text: 'Отклонён',    class: 'bg-red-900/40 text-red-300 border border-red-700' },
};

const PLAN_COLOR: Record<string, string> = {
  start:    'text-blue-400',
  business: 'text-emerald-400',
  pro:      'text-purple-400',
};

export default function PaymentRequestsPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [acting, setActing] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<PaymentRequest | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/payment-requests?status=${statusFilter}`);
      const data = await res.json();
      setRequests(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'confirm' | 'reject', daysCount?: number) {
    setActing(id);
    try {
      const res = await fetchWithAuth('/api/admin/payment-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, days: daysCount }),
      });
      const data = await res.json();
      if (data.success) {
        setRequests(prev => prev.map(r =>
          r.id === id
            ? { ...r, status: action === 'confirm' ? 'confirmed' : 'rejected' }
            : r
        ));
        setConfirmModal(null);
      }
    } finally {
      setActing(null);
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  function formatDate(d: string) {
    return new Date(d).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-emerald-400" />
          Заявки на оплату
          {pendingCount > 0 && statusFilter === 'pending' && (
            <span className="text-sm bg-red-500 text-white px-2.5 py-0.5 rounded-full font-semibold">
              {pendingCount}
            </span>
          )}
        </h1>
        <p className="text-gray-400 mt-1">Запросы от клиентов на выставление счёта</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              statusFilter === f
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {f === 'pending' ? 'Ожидают' : 'Все'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {statusFilter === 'pending' ? 'Нет новых заявок' : 'Заявок пока нет'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div
              key={req.id}
              className={`bg-gray-800/80 rounded-2xl p-5 border ${
                req.status === 'pending' ? 'border-yellow-700/50' : 'border-gray-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${STATUS_LABEL[req.status]?.class} px-2.5 py-0.5 rounded-full`}>
                      {STATUS_LABEL[req.status]?.text}
                    </span>
                    <span className={`font-bold text-base ${PLAN_COLOR[req.plan_id] ?? 'text-white'}`}>
                      {req.plan_name} — {req.price.toLocaleString('ru-RU')} ₸/мес
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      {req.user_name || '—'}
                      {req.user_email && <span className="text-gray-500">({req.user_email})</span>}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      <span className="font-mono">{req.kaspi_phone}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      {formatDate(req.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {req.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setConfirmModal(req); setDays(30); }}
                      disabled={acting === req.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Подтвердить
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'reject')}
                      disabled={acting === req.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-red-900/50 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Отклонить
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmModal(null)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Подтвердить оплату</h3>
            <p className="text-sm text-gray-400 mb-4">
              {confirmModal.user_name} — {confirmModal.plan_name} ({confirmModal.price.toLocaleString('ru-RU')} ₸/мес)
            </p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Срок подписки (дней)
              </label>
              <div className="flex gap-2">
                {[30, 60, 90, 365].map(d => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      days === d
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {d === 365 ? '1 год' : `${d}д`}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Подписка будет активирована на {days} дней с сегодняшней даты.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 bg-gray-700 text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-600 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => handleAction(confirmModal.id, 'confirm', days)}
                disabled={acting === confirmModal.id}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 cursor-pointer disabled:opacity-50"
              >
                {acting === confirmModal.id ? 'Активация...' : 'Активировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
