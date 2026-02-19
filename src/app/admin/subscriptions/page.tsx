'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Calendar, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, RefreshCw, Loader2,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface AdminSubscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean | null;
}

const planLabels: Record<string, string> = { start: 'Старт', business: 'Бизнес', pro: 'Pro' };

export default function SubscriptionsPage() {
  const { user } = useUser();
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!user?.id) return;
    fetchSubscriptions();
  }, [user?.id]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions?userId=${user!.id}`);
      const data = await res.json();
      if (data.success) setSubscriptions(data.data);
    } catch (err) {
      console.error('Fetch subscriptions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = sub.userName.toLowerCase().includes(search.toLowerCase()) ||
                           sub.userEmail.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === 'all' || sub.plan === planFilter;
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [subscriptions, search, planFilter, statusFilter]);

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
  const paginated = filteredSubscriptions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPlanColor = (plan: string | null) => {
    switch (plan) {
      case 'pro': return 'bg-purple-100 text-purple-700';
      case 'business': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusInfo = (status: string | null) => {
    switch (status) {
      case 'active':
        return { icon: <CheckCircle className="w-4 h-4" />, text: 'Активна', color: 'text-emerald-600' };
      case 'expired':
        return { icon: <Clock className="w-4 h-4" />, text: 'Истекла', color: 'text-amber-600' };
      case 'cancelled':
        return { icon: <XCircle className="w-4 h-4" />, text: 'Отменена', color: 'text-red-600' };
      default:
        return { icon: null, text: status || '—', color: 'text-gray-600' };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Подписки</h1>
        <p className="text-gray-500 mt-1">{loading ? 'Загрузка...' : `${subscriptions.length} подписок`}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0 lg:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по имени или email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '48px' }}
              className="w-full pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Filter className="w-5 h-5 text-gray-400 hidden sm:block" />
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="all">Все тарифы</option>
              <option value="start">Старт</option>
              <option value="business">Бизнес</option>
              <option value="pro">Pro</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="expired">Истёкшие</option>
              <option value="cancelled">Отменённые</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Пользователь</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Тариф</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Срок действия</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map(sub => {
                  const statusInfo = getStatusInfo(sub.status);
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{sub.userName}</div>
                        <div className="text-xs text-gray-500">{sub.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(sub.plan)}`}>
                          {sub.plan ? (planLabels[sub.plan] || sub.plan) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(sub.startDate)} — {formatDate(sub.endDate)}
                        </div>
                        {sub.autoRenew && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 mt-0.5">
                            <RefreshCw className="w-3 h-3" />
                            Автопродление
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-sm ${statusInfo.color}`}>
                          {statusInfo.icon}
                          <span className="hidden sm:inline">{statusInfo.text}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredSubscriptions.length > 0
                ? `${((currentPage - 1) * itemsPerPage) + 1}–${Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)} из ${filteredSubscriptions.length}`
                : 'Нет подписок'
              }
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">{currentPage} / {totalPages || 1}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
