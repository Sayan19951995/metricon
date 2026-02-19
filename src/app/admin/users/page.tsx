'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, MoreVertical, Shield, User,
  ChevronLeft, ChevronRight, CheckCircle, Store, Loader2,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  isAdmin: boolean;
  storeName: string | null;
  kaspiConnected: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
}

const planLabels: Record<string, string> = { start: 'Старт', business: 'Бизнес', pro: 'Pro' };

export default function UsersPage() {
  const { user } = useUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [planModal, setPlanModal] = useState<{ userId: string; currentPlan: string } | null>(null);
  const [profileModal, setProfileModal] = useState<string | null>(null);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!user?.id) return;
    fetchUsers();
  }, [user?.id]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?userId=${user!.id}`);
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
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: user!.id, targetUserId: targetId, action: 'toggleAdmin', value: !currentAdmin }),
      });
    } catch { await fetchUsers(); }
  };

  const changePlan = async (targetId: string, newPlan: string) => {
    setUsers(prev => prev.map(u => u.id === targetId ? { ...u, plan: newPlan } : u));
    setPlanModal(null);
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: user!.id, targetUserId: targetId, action: 'changePlan', value: newPlan }),
      });
    } catch { await fetchUsers(); }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                           u.email.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === 'all' || u.plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [users, search, planFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getPlanColor = (plan: string | null) => {
    switch (plan) {
      case 'pro': return 'bg-purple-100 text-purple-700';
      case 'business': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Пользователи</h1>
        <p className="text-gray-500 mt-1">{loading ? 'Загрузка...' : `${users.length} пользователей`}</p>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Тариф</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Kaspi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Магазин</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">⋯</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          u.isAdmin ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {u.isAdmin ? <Shield className="w-4 h-4 text-red-600" /> : <User className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{u.name}</div>
                          <div className="text-xs text-gray-500 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell whitespace-nowrap">
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
                      {u.kaspiConnected ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {u.storeName ? (
                        <span className="flex items-center gap-1 text-sm text-gray-700">
                          <Store className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[150px]">{u.storeName}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                        {openMenu === u.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                              <button
                                onClick={() => { setProfileModal(u.id); setOpenMenu(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Профиль
                              </button>
                              <button
                                onClick={() => { setPlanModal({ userId: u.id, currentPlan: u.plan || 'start' }); setOpenMenu(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Изменить тариф
                              </button>
                              <button
                                onClick={() => toggleAdmin(u.id, u.isAdmin)}
                                className={`w-full px-4 py-2 text-left text-sm ${u.isAdmin ? 'text-gray-600 hover:bg-gray-50' : 'text-purple-600 hover:bg-purple-50'}`}
                              >
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
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredUsers.length)} из {filteredUsers.length}
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

      {/* Plan change modal */}
      {planModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPlanModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Изменить тариф</h3>
            <div className="space-y-2">
              {['start', 'business', 'pro'].map(plan => (
                <button
                  key={plan}
                  onClick={() => changePlan(planModal.userId, plan)}
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

      {/* Profile modal */}
      {profileModal && (() => {
        const u = users.find(x => x.id === profileModal);
        if (!u) return null;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setProfileModal(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${u.isAdmin ? 'bg-red-100' : 'bg-gray-100'}`}>
                  {u.isAdmin ? <Shield className="w-7 h-7 text-red-600" /> : <User className="w-7 h-7 text-gray-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{u.name}</h3>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Тариф</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlanColor(u.plan)}`}>
                    {u.plan ? (planLabels[u.plan] || u.plan) : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Kaspi</span>
                  <span className={u.kaspiConnected ? 'text-emerald-600' : 'text-gray-400'}>
                    {u.kaspiConnected ? 'Подключён' : 'Нет'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Магазин</span>
                  <span className="text-gray-700">{u.storeName || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Роль</span>
                  <span className={u.isAdmin ? 'text-red-600 font-medium' : 'text-gray-700'}>
                    {u.isAdmin ? 'Администратор' : 'Пользователь'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Регистрация</span>
                  <span className="text-gray-700">{u.createdAt ? formatDate(u.createdAt) : '—'}</span>
                </div>
              </div>
              <button onClick={() => setProfileModal(null)} className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                Закрыть
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
