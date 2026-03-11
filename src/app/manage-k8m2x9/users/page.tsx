'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Filter, MoreVertical, Shield, User,
  ChevronLeft, ChevronRight, CheckCircle, Store, Loader2,
  Ban, LogIn, CreditCard, ArrowUpDown,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  isAdmin: boolean;
  isBlocked: boolean;
  storeName: string | null;
  kaspiConnected: boolean;
  kaspiApiConnected: boolean;
  kaspiMarketingConnected: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
  subscriptionEnd: string | null;
  hasPreorder: boolean;
  hasAutoPricing: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

const planLabels: Record<string, string> = { start: 'Старт', business: 'Бизнес', pro: 'Pro' };

type SortKey = 'name' | 'createdAt' | 'plan';
type SortDir = 'asc' | 'desc';

export default function UsersPage() {
  const { user } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [planModal, setPlanModal] = useState<{ userId: string; currentPlan: string } | null>(null);
  const [profileModal, setProfileModal] = useState<string | null>(null);
  const [subModal, setSubModal] = useState<string | null>(null);  // userId for subscription create
  const [subPlan, setSubPlan] = useState('start');
  const [subDays, setSubDays] = useState(30);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [actionLoading, setActionLoading] = useState(false);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!user?.id) return;
    fetchUsers();
  }, [user?.id]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (targetId: string, currentAdmin: boolean) => {
    setUsers(prev => prev.map(u => u.id === targetId ? { ...u, isAdmin: !currentAdmin } : u));
    setOpenMenu(null);
    try {
      await fetchWithAuth('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetId, action: 'toggleAdmin', value: !currentAdmin }),
      });
    } catch { await fetchUsers(); }
  };

  const toggleBlock = async (targetId: string, currentBlocked: boolean) => {
    setUsers(prev => prev.map(u => u.id === targetId ? { ...u, isBlocked: !currentBlocked } : u));
    setOpenMenu(null);
    try {
      await fetchWithAuth('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetId, action: 'blockUser', value: !currentBlocked }),
      });
    } catch { await fetchUsers(); }
  };

  const changePlan = async (targetId: string, newPlan: string) => {
    setUsers(prev => prev.map(u => u.id === targetId ? { ...u, plan: newPlan } : u));
    setPlanModal(null);
    try {
      await fetchWithAuth('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetId, action: 'changePlan', value: newPlan }),
      });
    } catch { await fetchUsers(); }
  };

  const createSubscription = async () => {
    if (!subModal) return;
    setActionLoading(true);
    try {
      await fetchWithAuth('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: subModal,
          action: 'createSubscription',
          value: { plan: subPlan, durationDays: subDays },
        }),
      });
      await fetchUsers();
    } catch (err) {
      console.error('Create subscription error:', err);
    } finally {
      setActionLoading(false);
      setSubModal(null);
      setSubPlan('start');
      setSubDays(30);
    }
  };

  const impersonate = (targetId: string) => {
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser) return;
    localStorage.setItem('admin_impersonating', JSON.stringify({
      adminId: user!.id,
      targetId,
      targetName: targetUser.name,
      targetEmail: targetUser.email,
    }));
    setOpenMenu(null);
    router.push('/app');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                           u.email.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === 'all' || u.plan === planFilter || (planFilter === 'none' && !u.plan);
      return matchesSearch && matchesPlan;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'plan':
          cmp = (a.plan || '').localeCompare(b.plan || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [users, search, planFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getPlanColor = (plan: string | null) => {
    switch (plan) {
      case 'pro': return 'bg-purple-500/20 text-purple-400';
      case 'business': return 'bg-emerald-500/20 text-emerald-400';
      case 'start': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-700 text-gray-500';
    }
  };

  const SortIcon = ({ field }: { field: SortKey }) => (
    <ArrowUpDown className={`w-3.5 h-3.5 inline ml-1 ${sortKey === field ? 'text-white' : 'text-gray-400'}`} />
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Пользователи</h1>
        <p className="text-gray-500 mt-1">{loading ? 'Загрузка...' : `${users.length} пользователей`}</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/80 rounded-xl p-4 shadow-sm mb-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0 lg:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по имени или email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '48px' }}
              className="w-full pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Filter className="w-5 h-5 text-gray-400 hidden sm:block" />
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white text-sm"
            >
              <option value="all">Все тарифы</option>
              <option value="start">Старт</option>
              <option value="business">Бизнес</option>
              <option value="pro">Pro</option>
              <option value="none">Без подписки</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-gray-800/80 rounded-xl shadow-sm overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort('name')}
                  >
                    Пользователь <SortIcon field="name" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:text-white"
                    onClick={() => handleSort('createdAt')}
                  >
                    Дата <SortIcon field="createdAt" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort('plan')}
                  >
                    Тариф <SortIcon field="plan" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Предзаказ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Автодемпинг</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Кабинет</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">API</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Маркетинг</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Магазин</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Источник</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">...</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paginatedUsers.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-700/50 transition-colors ${u.isBlocked ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          u.isBlocked ? 'bg-red-500/20' : u.isAdmin ? 'bg-amber-500/20' : 'bg-gray-700'
                        }`}>
                          {u.isBlocked ? (
                            <Ban className="w-4 h-4 text-red-600" />
                          ) : u.isAdmin ? (
                            <Shield className="w-4 h-4 text-amber-600" />
                          ) : (
                            <User className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-medium text-sm truncate ${u.isBlocked ? 'text-red-600 line-through' : 'text-white'}`}>
                            {u.name}
                            {u.isAdmin && <span className="ml-1.5 text-xs text-amber-600 font-normal">admin</span>}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell whitespace-nowrap">
                      {u.createdAt ? formatDate(u.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.plan ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(u.plan)}`}>
                          {planLabels[u.plan] || u.plan}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.hasPreorder ? (
                        <CheckCircle className="w-4 h-4 text-purple-500" />
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.hasAutoPricing ? (
                        <CheckCircle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.kaspiConnected ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.kaspiApiConnected ? (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.kaspiMarketingConnected ? (
                        <CheckCircle className="w-4 h-4 text-purple-500" />
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {u.storeName ? (
                        <span className="flex items-center gap-1 text-sm text-gray-300">
                          <Store className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[150px]">{u.storeName}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {u.utmSource ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400" title={[u.utmSource, u.utmMedium, u.utmCampaign].filter(Boolean).join(' / ')}>
                          {u.utmSource}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <button
                          onClick={(e) => {
                            if (openMenu === u.id) {
                              setOpenMenu(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPos({ top: rect.bottom + 4, left: rect.right - 208 });
                              setOpenMenu(u.id);
                            }
                          }}
                          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                        {openMenu === u.id && (
                          <>
                            <div className="fixed inset-0 z-[90]" onClick={() => setOpenMenu(null)} />
                            <div
                              className="fixed w-52 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-[100]"
                              style={{ top: menuPos.top, left: menuPos.left }}
                            >
                              <button
                                onClick={() => { setProfileModal(u.id); setOpenMenu(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <User className="w-4 h-4 text-gray-400" />
                                Профиль
                              </button>
                              <button
                                onClick={() => { setPlanModal({ userId: u.id, currentPlan: u.plan || 'start' }); setOpenMenu(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <CreditCard className="w-4 h-4 text-gray-400" />
                                Изменить тариф
                              </button>
                              <button
                                onClick={() => { setSubModal(u.id); setOpenMenu(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <CreditCard className="w-4 h-4 text-emerald-500" />
                                Создать подписку
                              </button>
                              <div className="border-t border-gray-700 my-1" />
                              <button
                                onClick={() => impersonate(u.id)}
                                className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                              >
                                <LogIn className="w-4 h-4" />
                                Войти как пользователь
                              </button>
                              <div className="border-t border-gray-700 my-1" />
                              <button
                                onClick={() => toggleBlock(u.id, u.isBlocked)}
                                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                  u.isBlocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <Ban className="w-4 h-4" />
                                {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                              </button>
                              <button
                                onClick={() => toggleAdmin(u.id, u.isAdmin)}
                                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                  u.isAdmin ? 'text-gray-400 hover:bg-gray-700' : 'text-purple-600 hover:bg-purple-50'
                                }`}
                              >
                                <Shield className="w-4 h-4" />
                                {u.isAdmin ? 'Убрать админа' : 'Сделать админом'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredUsers.length > 0
                ? `${((currentPage - 1) * itemsPerPage) + 1}–${Math.min(currentPage * itemsPerPage, filteredUsers.length)} из ${filteredUsers.length}`
                : 'Нет пользователей'
              }
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400">{currentPage} / {totalPages || 1}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan change modal */}
      {planModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPlanModal(null)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Изменить тариф</h3>
            <div className="space-y-2">
              {['start', 'business', 'pro'].map(plan => (
                <button
                  key={plan}
                  onClick={() => changePlan(planModal.userId, plan)}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    planModal.currentPlan === plan
                      ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <span className="font-medium">{planLabels[plan] || plan}</span>
                  {planModal.currentPlan === plan && <span className="text-xs ml-2">(текущий)</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setPlanModal(null)} className="w-full mt-4 px-4 py-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Create subscription modal */}
      {subModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSubModal(null)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-1">Создать подписку</h3>
            <p className="text-sm text-gray-500 mb-4">
              {users.find(u => u.id === subModal)?.name} — {users.find(u => u.id === subModal)?.email}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Тариф</label>
                <div className="space-y-2">
                  {['start', 'business', 'pro'].map(plan => (
                    <button
                      key={plan}
                      onClick={() => setSubPlan(plan)}
                      className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        subPlan === plan
                          ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400 font-medium'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                      }`}
                    >
                      {planLabels[plan]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Срок (дней)</label>
                <div className="flex gap-2">
                  {[7, 30, 90, 365].map(d => (
                    <button
                      key={d}
                      onClick={() => setSubDays(d)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                        subDays === d
                          ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400 font-medium'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
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
                onClick={() => setSubModal(null)}
                className="flex-1 px-4 py-2.5 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={createSubscription}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
              >
                {actionLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {profileModal && (() => {
        const u = users.find(x => x.id === profileModal);
        if (!u) return null;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setProfileModal(null)}>
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  u.isBlocked ? 'bg-red-500/20' : u.isAdmin ? 'bg-amber-500/20' : 'bg-gray-700'
                }`}>
                  {u.isBlocked ? (
                    <Ban className="w-7 h-7 text-red-600" />
                  ) : u.isAdmin ? (
                    <Shield className="w-7 h-7 text-amber-600" />
                  ) : (
                    <User className="w-7 h-7 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{u.name}</h3>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  {u.isBlocked && (
                    <span className="text-xs text-red-600 font-medium">Заблокирован</span>
                  )}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Тариф</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlanColor(u.plan)}`}>
                    {u.plan ? (planLabels[u.plan] || u.plan) : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Подписка до</span>
                  <span className="text-gray-300">
                    {u.subscriptionEnd ? formatDate(u.subscriptionEnd) : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Кабинет Kaspi</span>
                  <span className={u.kaspiConnected ? 'text-emerald-500' : 'text-gray-400'}>
                    {u.kaspiConnected ? 'Подключён' : 'Нет'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Kaspi API</span>
                  <span className={u.kaspiApiConnected ? 'text-blue-400' : 'text-gray-400'}>
                    {u.kaspiApiConnected ? 'Подключён' : 'Нет'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Kaspi Маркетинг</span>
                  <span className={u.kaspiMarketingConnected ? 'text-purple-400' : 'text-gray-400'}>
                    {u.kaspiMarketingConnected ? 'Подключён' : 'Нет'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Предзаказ</span>
                  <span className={u.hasPreorder ? 'text-purple-400' : 'text-gray-400'}>
                    {u.hasPreorder ? 'Активен' : 'Нет'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Автодемпинг</span>
                  <span className={u.hasAutoPricing ? 'text-amber-400' : 'text-gray-400'}>
                    {u.hasAutoPricing ? 'Активен' : 'Нет'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Магазин</span>
                  <span className="text-gray-300">{u.storeName || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Роль</span>
                  <span className={u.isAdmin ? 'text-amber-600 font-medium' : 'text-gray-300'}>
                    {u.isAdmin ? 'Администратор' : 'Пользователь'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Статус</span>
                  <span className={u.isBlocked ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                    {u.isBlocked ? 'Заблокирован' : 'Активен'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Регистрация</span>
                  <span className="text-gray-300">{u.createdAt ? formatDate(u.createdAt) : '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-500">Телефон</span>
                  <span className="text-gray-300">{u.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Источник</span>
                  <span className="text-gray-300">
                    {u.utmSource
                      ? [u.utmSource, u.utmMedium, u.utmCampaign].filter(Boolean).join(' / ')
                      : '—'}
                  </span>
                </div>
              </div>
              <button onClick={() => setProfileModal(null)} className="w-full mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                Закрыть
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
