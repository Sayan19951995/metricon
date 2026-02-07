'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  Filter,
  MoreVertical,
  Ban,
  CheckCircle,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Package,
  ShoppingCart,
  Wallet,
  RefreshCw,
  X,
  Store,
} from 'lucide-react';

// Генерация моковых пользователей
const generateMockUsers = () => {
  const names = [
    'Алексей Иванов', 'Мария Петрова', 'Дмитрий Сидоров', 'Анна Козлова', 'Сергей Новиков',
    'Елена Морозова', 'Андрей Волков', 'Ольга Соколова', 'Николай Лебедев', 'Татьяна Орлова',
    'Павел Кузнецов', 'Наталья Попова', 'Артём Васильев', 'Екатерина Смирнова', 'Владимир Зайцев',
    'Юлия Павлова', 'Максим Семёнов', 'Ирина Голубева', 'Роман Виноградов', 'Светлана Богданова',
    'Денис Фёдоров', 'Оксана Михайлова', 'Евгений Ковалёв', 'Людмила Ильина', 'Александр Гусев',
    'Вероника Кириллова', 'Илья Пономарёв', 'Кристина Одинцова', 'Игорь Сорокин', 'Виктория Захарова',
    'Борис Белов', 'Галина Комарова', 'Георгий Воронов', 'Диана Климова', 'Эдуард Фролов',
    'Анжела Романова', 'Владислав Савельев', 'Жанна Калинина', 'Константин Горбунов', 'Лариса Медведева',
    'Михаил Антонов', 'Надежда Тарасова', 'Олег Николаев', 'Полина Алексеева', 'Руслан Панов',
    'Софья Егорова', 'Тимур Марков', 'Ульяна Кузьмина', 'Фёдор Степанов', 'Яна Яковлева',
  ];

  const plans = ['Старт', 'Бизнес', 'Pro'];
  const statuses = ['active', 'blocked'];

  return names.map((name, idx) => {
    const email = name.toLowerCase().replace(' ', '.').replace(/[а-яё]/gi, (char) => {
      const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      };
      return map[char.toLowerCase()] || char;
    }) + '@mail.kz';

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 365));

    return {
      id: `user-${idx + 1}`,
      name,
      email,
      plan: plans[Math.floor(Math.random() * plans.length)],
      status: idx < 45 ? 'active' : 'blocked',
      kaspiConnected: Math.random() > 0.3,
      createdAt: createdAt.toISOString(),
      role: idx === 0 ? 'admin' : 'user',
    };
  });
};

const initialUsers = generateMockUsers();

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [planModal, setPlanModal] = useState<{ userId: string; currentPlan: string } | null>(null);
  const [profileModal, setProfileModal] = useState<string | null>(null);
  const [kaspiModal, setKaspiModal] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Действия с пользователями
  const toggleBlockUser = (userId: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, status: user.status === 'active' ? 'blocked' : 'active' }
        : user
    ));
    setOpenMenu(null);
  };

  const changeUserPlan = (userId: string, newPlan: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, plan: newPlan } : user
    ));
    setPlanModal(null);
  };

  const makeAdmin = (userId: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, role: 'admin' } : user
    ));
    setOpenMenu(null);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
                           user.email.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === 'all' || user.plan === planFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [search, planFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Pro': return 'bg-purple-100 text-purple-700';
      case 'Бизнес': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Пользователи</h1>
        <p className="text-gray-500 mt-1">Управление пользователями платформы</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
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

          {/* Filters */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Filter className="w-5 h-5 text-gray-400 hidden sm:block" />
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="all">Все тарифы</option>
              <option value="Старт">Старт</option>
              <option value="Бизнес">Бизнес</option>
              <option value="Pro">Pro</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Пользователь</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Дата регистрации</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Тариф</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Kaspi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Статус</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        user.role === 'admin' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {user.role === 'admin' ? (
                          <Shield className="w-4 h-4 text-red-600" />
                        ) : (
                          <User className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(user.plan)}`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {user.kaspiConnected ? (
                      <span className="text-emerald-600 text-sm">Подключён</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Нет</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.status === 'active' ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Активен</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <Ban className="w-4 h-4" />
                        <span className="hidden sm:inline">Заблокирован</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                      {openMenu === user.id && (
                        <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => { setProfileModal(user.id); setOpenMenu(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Просмотр профиля
                          </button>
                          <button
                            onClick={() => { setPlanModal({ userId: user.id, currentPlan: user.plan }); setOpenMenu(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Изменить тариф
                          </button>
                          {user.kaspiConnected && (
                            <Link
                              href={`/admin/users/${user.id}/kaspi`}
                              className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                              onClick={() => setOpenMenu(null)}
                            >
                              <Store className="w-4 h-4" />
                              Кабинет Kaspi
                            </Link>
                          )}
                          {user.status === 'active' ? (
                            <button
                              onClick={() => toggleBlockUser(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              Заблокировать
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleBlockUser(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50"
                            >
                              Разблокировать
                            </button>
                          )}
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => makeAdmin(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50"
                            >
                              Сделать админом
                            </button>
                          )}
                        </div>
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
            Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} из {filteredUsers.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Модалка изменения тарифа */}
      {planModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPlanModal(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Изменить тариф</h3>
            <div className="space-y-2">
              {['Старт', 'Бизнес', 'Pro'].map(plan => (
                <button
                  key={plan}
                  onClick={() => changeUserPlan(planModal.userId, plan)}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    planModal.currentPlan === plan
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{plan}</span>
                  {planModal.currentPlan === plan && <span className="text-xs ml-2">(текущий)</span>}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPlanModal(null)}
              className="w-full mt-4 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Отмена
            </button>
          </motion.div>
        </div>
      )}

      {/* Модалка профиля */}
      {profileModal && (() => {
        const user = users.find(u => u.id === profileModal);
        if (!user) return null;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setProfileModal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  user.role === 'admin' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {user.role === 'admin' ? (
                    <Shield className="w-7 h-7 text-red-600" />
                  ) : (
                    <User className="w-7 h-7 text-gray-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Тариф</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlanColor(user.plan)}`}>{user.plan}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Статус</span>
                  <span className={user.status === 'active' ? 'text-emerald-600' : 'text-red-600'}>
                    {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Kaspi</span>
                  <span className={user.kaspiConnected ? 'text-emerald-600' : 'text-gray-400'}>
                    {user.kaspiConnected ? 'Подключён' : 'Не подключён'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Роль</span>
                  <span className={user.role === 'admin' ? 'text-red-600 font-medium' : 'text-gray-700'}>
                    {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Дата регистрации</span>
                  <span className="text-gray-700">{formatDate(user.createdAt)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                {user.kaspiConnected && (
                  <button
                    onClick={() => { setKaspiModal(user.id); setProfileModal(null); }}
                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Kaspi данные
                  </button>
                )}
                <button
                  onClick={() => setProfileModal(null)}
                  className={`${user.kaspiConnected ? 'flex-1' : 'w-full'} px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors`}
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Модалка Kaspi данных */}
      {kaspiModal && (() => {
        const user = users.find(u => u.id === kaspiModal);
        if (!user) return null;

        // Моковые данные Kaspi
        const kaspiData = {
          balance: 2450000,
          ordersToday: 12,
          ordersThisWeek: 67,
          revenue: 4850000,
          products: 156,
          lastSync: '5 мин назад',
          recentOrders: [
            { id: 'KS-001247', amount: 125000, status: 'new', customer: 'Иван П.' },
            { id: 'KS-001246', amount: 89000, status: 'processing', customer: 'Мария К.' },
            { id: 'KS-001245', amount: 245000, status: 'shipped', customer: 'Алексей С.' },
            { id: 'KS-001244', amount: 67000, status: 'delivered', customer: 'Ольга В.' },
          ],
          topProducts: [
            { name: 'iPhone 14 Pro', sales: 23, stock: 5 },
            { name: 'AirPods Pro 2', sales: 45, stock: 12 },
            { name: 'MacBook Air M2', sales: 8, stock: 3 },
          ]
        };

        const getOrderStatusColor = (status: string) => {
          switch(status) {
            case 'new': return 'bg-blue-100 text-blue-700';
            case 'processing': return 'bg-amber-100 text-amber-700';
            case 'shipped': return 'bg-purple-100 text-purple-700';
            case 'delivered': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-gray-100 text-gray-700';
          }
        };

        const getOrderStatusText = (status: string) => {
          switch(status) {
            case 'new': return 'Новый';
            case 'processing': return 'В обработке';
            case 'shipped': return 'Отправлен';
            case 'delivered': return 'Доставлен';
            default: return status;
          }
        };

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setKaspiModal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-amber-500 text-white p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Kaspi данные: {user.name}</h3>
                  <p className="text-amber-100 text-sm flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Обновлено: {kaspiData.lastSync}
                  </p>
                </div>
                <button onClick={() => setKaspiModal(null)} className="p-1 hover:bg-amber-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Wallet className="w-4 h-4" />
                      Баланс
                    </div>
                    <div className="text-lg font-bold text-gray-900">{(kaspiData.balance / 1000).toFixed(0)}k ₸</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <ShoppingCart className="w-4 h-4" />
                      Заказов сегодня
                    </div>
                    <div className="text-lg font-bold text-gray-900">{kaspiData.ordersToday}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Package className="w-4 h-4" />
                      Товаров
                    </div>
                    <div className="text-lg font-bold text-gray-900">{kaspiData.products}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Wallet className="w-4 h-4" />
                      Выручка (нед)
                    </div>
                    <div className="text-lg font-bold text-gray-900">{(kaspiData.revenue / 1000000).toFixed(1)}M ₸</div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Последние заказы</h4>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    {kaspiData.recentOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{order.id}</span>
                          <span className="text-xs text-gray-500 ml-2">{order.customer}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusText(order.status)}
                          </span>
                          <span className="text-sm font-medium text-gray-700">{(order.amount / 1000).toFixed(0)}k ₸</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Топ товаров</h4>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    {kaspiData.topProducts.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-900">{product.name}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-500">Продаж: <span className="font-medium text-gray-700">{product.sales}</span></span>
                          <span className={`${product.stock < 5 ? 'text-red-600' : 'text-gray-500'}`}>
                            Остаток: <span className="font-medium">{product.stock}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Кнопка полного кабинета */}
                <Link
                  href={`/admin/users/${user.id}/kaspi`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
                >
                  <Store className="w-5 h-5" />
                  Открыть полный кабинет Kaspi
                </Link>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}
