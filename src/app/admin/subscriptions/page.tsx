'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Calendar, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, RefreshCw, Loader2,
  MoreVertical, Plus, CalendarPlus, CreditCard, Ban,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [extendModal, setExtendModal] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [planModal, setPlanModal] = useState<{ subId: string; currentPlan: string } | null>(null);
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [createUserId, setCreateUserId] = useState('');
  const [createUserSearch, setCreateUserSearch] = useState('');
  const [createPlan, setCreatePlan] = useState('start');
  const [createDays, setCreateDays] = useState(30);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  const itemsPerPage = 15;

  useEffect(() => {
    if (!user?.id) return;
    fetchSubscriptions();
  }, [user?.id]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/subscriptions');
      const data = await res.json();
      if (data.success) setSubscriptions(data.data);
    } catch (err) {
      console.error('Fetch subscriptions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.data.map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const handleExtend = async () => {
    if (!extendModal) return;
    setActionLoading(true);
    try {
      await fetchWithAuth('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: extendModal,
          action: 'extend',
          value: extendDays,
        }),
      });
      await fetchSubscriptions();
    } catch (err) {
      console.error('Extend error:', err);
    } finally {
      setActionLoading(false);
      setExtendModal(null);
      setExtendDays(30);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setActionLoading(true);
    try {
      await fetchWithAuth('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: cancelModal,
          action: 'cancel',
        }),
      });
      await fetchSubscriptions();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setActionLoading(false);
      setCancelModal(null);
    }
  };

  const handleChangePlan = async (newPlan: string) => {
    if (!planModal) return;
    setActionLoading(true);
    try {
      await fetchWithAuth('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: planModal.subId,
          action: 'changePlan',
          value: newPlan,
        }),
      });
      await fetchSubscriptions();
    } catch (err) {
      console.error('Change plan error:', err);
    } finally {
      setActionLoading(false);
      setPlanModal(null);
    }
  };

  const handleCreate = async () => {
    if (!createUserId) return;
    setActionLoading(true);
    try {
      await fetchWithAuth('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: createUserId,
          plan: createPlan,
          durationDays: createDays,
        }),
      });
      await fetchSubscriptions();
    } catch (err) {
      console.error('Create subscription error:', err);
    } finally {
      setActionLoading(false);
      setCreateModal(false);
      setCreateUserId('');
      setCreateUserSearch('');
      setCreatePlan('start');
      setCreateDays(30);
    }
  };

  const openCreateModal = () => {
    setCreateModal(true);
    if (allUsers.length === 0) fetchAllUsers();
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

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
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
        return { icon: <CheckCircle className="w-4 h-4" />, text: 'Активна', color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'expired':
        return { icon: <Clock className="w-4 h-4" />, text: 'Истекла', color: 'text-amber-600', bg: 'bg-amber-50' };
      case 'cancelled':
        return { icon: <XCircle className="w-4 h-4" />, text: 'Отменена', color: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { icon: null, text: status || '—', color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const filteredCreateUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(createUserSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(createUserSearch.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Подписки</h1>
          <p className="text-gray-500 mt-1">{loading ? 'Загрузка...' : `${subscriptions.length} подписок`}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 rounded-xl text-sm font-medium text-white hover:bg-gray-800 transition-colors shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          Создать подписку
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-gray-100">
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Пользователь</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Тариф</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Срок действия</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Осталось</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">...</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map(sub => {
                  const statusInfo = getStatusInfo(sub.status);
                  const daysLeft = getDaysRemaining(sub.endDate);
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
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bg}`}>
                          {statusInfo.icon}
                          <span className="hidden sm:inline">{statusInfo.text}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {daysLeft !== null ? (
                          <span className={`text-sm font-medium ${
                            daysLeft < 0 ? 'text-red-600' :
                            daysLeft <= 7 ? 'text-amber-600' :
                            'text-gray-600'
                          }`}>
                            {daysLeft < 0
                              ? `${Math.abs(daysLeft)}д просрочена`
                              : daysLeft === 0
                                ? 'Сегодня'
                                : `${daysLeft}д`
                            }
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <button
                            onClick={(e) => {
                              if (openMenu === sub.id) {
                                setOpenMenu(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPos({ top: rect.bottom + 4, left: rect.right - 208 });
                                setOpenMenu(sub.id);
                              }
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          {openMenu === sub.id && (
                            <>
                              <div className="fixed inset-0 z-[90]" onClick={() => setOpenMenu(null)} />
                              <div
                                className="fixed w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100]"
                                style={{ top: menuPos.top, left: menuPos.left }}
                              >
                                <button
                                  onClick={() => { setExtendModal(sub.id); setOpenMenu(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <CalendarPlus className="w-4 h-4 text-emerald-500" />
                                  Продлить
                                </button>
                                <button
                                  onClick={() => { setPlanModal({ subId: sub.id, currentPlan: sub.plan || 'start' }); setOpenMenu(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <CreditCard className="w-4 h-4 text-blue-500" />
                                  Изменить тариф
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                {sub.status !== 'cancelled' && (
                                  <button
                                    onClick={() => { setCancelModal(sub.id); setOpenMenu(null); }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Ban className="w-4 h-4" />
                                    Отменить подписку
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
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

      {/* Extend subscription modal */}
      {extendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setExtendModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Продлить подписку</h3>
            <p className="text-sm text-gray-500 mb-4">
              {subscriptions.find(s => s.id === extendModal)?.userName}
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">На сколько дней?</label>
              <div className="flex gap-2 mb-3">
                {[7, 30, 90, 365].map(d => (
                  <button
                    key={d}
                    onClick={() => setExtendDays(d)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      extendDays === d
                        ? 'bg-blue-50 border-2 border-blue-500 text-blue-700 font-medium'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {d}д
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Или введите количество дней"
                min={1}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setExtendModal(null)}
                className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                Отмена
              </button>
              <button
                onClick={handleExtend}
                disabled={actionLoading || extendDays <= 0}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
              >
                {actionLoading ? 'Продление...' : `Продлить на ${extendDays}д`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change plan modal */}
      {planModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPlanModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Изменить тариф</h3>
            <div className="space-y-2">
              {['start', 'business', 'pro'].map(plan => (
                <button
                  key={plan}
                  onClick={() => handleChangePlan(plan)}
                  disabled={actionLoading}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    planModal.currentPlan === plan
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{planLabels[plan] || plan}</span>
                  {planModal.currentPlan === plan && <span className="text-xs ml-2">(текущий)</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setPlanModal(null)} className="w-full mt-4 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Cancel subscription modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCancelModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Отменить подписку?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Подписка пользователя <span className="font-medium text-gray-700">{subscriptions.find(s => s.id === cancelModal)?.userName}</span> будет отменена.
              Это действие можно отменить, продлив подписку заново.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                Назад
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
              >
                {actionLoading ? 'Отмена...' : 'Отменить подписку'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create subscription modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCreateModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Создать подписку</h3>

            <div className="space-y-4">
              {/* User search */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Пользователь</label>
                {createUserId ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {allUsers.find(u => u.id === createUserId)?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {allUsers.find(u => u.id === createUserId)?.email}
                      </div>
                    </div>
                    <button
                      onClick={() => { setCreateUserId(''); setCreateUserSearch(''); }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Изменить
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Поиск по имени или email..."
                      value={createUserSearch}
                      onChange={(e) => setCreateUserSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {createUserSearch && (
                      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {filteredCreateUsers.length > 0 ? filteredCreateUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => { setCreateUserId(u.id); setCreateUserSearch(''); }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </button>
                        )) : (
                          <div className="px-3 py-2 text-sm text-gray-400">Не найдено</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Plan */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Тариф</label>
                <div className="space-y-2">
                  {['start', 'business', 'pro'].map(plan => (
                    <button
                      key={plan}
                      onClick={() => setCreatePlan(plan)}
                      className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        createPlan === plan
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-700 font-medium'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {planLabels[plan]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Срок (дней)</label>
                <div className="flex gap-2">
                  {[7, 30, 90, 365].map(d => (
                    <button
                      key={d}
                      onClick={() => setCreateDays(d)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                        createDays === d
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-700 font-medium'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {d}д
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCreateModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                Отмена
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading || !createUserId}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
              >
                {actionLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
