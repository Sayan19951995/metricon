'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

// Генерация моковых подписок
const generateMockSubscriptions = () => {
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
  const planPrices = { 'Старт': 9900, 'Бизнес': 14900, 'Pro': 34900 };
  const statuses = ['active', 'expired', 'cancelled'];

  return names.map((name, idx) => {
    const plan = plans[Math.floor(Math.random() * plans.length)] as keyof typeof planPrices;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 60));

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const status = idx < 40 ? 'active' : idx < 45 ? 'expired' : 'cancelled';
    const autoRenew = status === 'active' && Math.random() > 0.3;

    return {
      id: `sub-${idx + 1}`,
      userName: name,
      userEmail: name.toLowerCase().replace(' ', '.').replace(/[а-яё]/gi, (char) => {
        const map: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
          'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        };
        return map[char.toLowerCase()] || char;
      }) + '@mail.kz',
      plan,
      price: planPrices[plan],
      status,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      autoRenew,
    };
  });
};

const mockSubscriptions = generateMockSubscriptions();

// Моковая история платежей
const mockPayments = [
  { id: 'pay-1', userName: 'Алексей Иванов', amount: 14900, plan: 'Бизнес', date: '2025-01-28', status: 'success' },
  { id: 'pay-2', userName: 'Мария Петрова', amount: 34900, plan: 'Pro', date: '2025-01-27', status: 'success' },
  { id: 'pay-3', userName: 'Дмитрий Сидоров', amount: 9900, plan: 'Старт', date: '2025-01-27', status: 'success' },
  { id: 'pay-4', userName: 'Анна Козлова', amount: 14900, plan: 'Бизнес', date: '2025-01-26', status: 'failed' },
  { id: 'pay-5', userName: 'Сергей Новиков', amount: 34900, plan: 'Pro', date: '2025-01-26', status: 'success' },
  { id: 'pay-6', userName: 'Елена Морозова', amount: 9900, plan: 'Старт', date: '2025-01-25', status: 'success' },
  { id: 'pay-7', userName: 'Андрей Волков', amount: 14900, plan: 'Бизнес', date: '2025-01-25', status: 'success' },
  { id: 'pay-8', userName: 'Ольга Соколова', amount: 34900, plan: 'Pro', date: '2025-01-24', status: 'refunded' },
];

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredSubscriptions = useMemo(() => {
    return mockSubscriptions.filter(sub => {
      const matchesSearch = sub.userName.toLowerCase().includes(search.toLowerCase()) ||
                           sub.userEmail.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === 'all' || sub.plan === planFilter;
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [search, planFilter, statusFilter]);

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
  const paginatedSubscriptions = filteredSubscriptions.slice(
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { icon: <CheckCircle className="w-4 h-4" />, text: 'Активна', color: 'text-emerald-600' };
      case 'expired':
        return { icon: <Clock className="w-4 h-4" />, text: 'Истекла', color: 'text-amber-600' };
      case 'cancelled':
        return { icon: <XCircle className="w-4 h-4" />, text: 'Отменена', color: 'text-red-600' };
      default:
        return { icon: null, text: status, color: 'text-gray-600' };
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-emerald-100 text-emerald-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'refunded': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Успешно';
      case 'failed': return 'Ошибка';
      case 'refunded': return 'Возврат';
      default: return status;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Подписки</h1>
        <p className="text-gray-500 mt-1">Управление подписками и платежами</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'subscriptions'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:bg-white/50'
          }`}
        >
          Подписки
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'payments'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:bg-white/50'
          }`}
        >
          История платежей
        </button>
      </div>

      {activeTab === 'subscriptions' && (
        <>
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
                  <option value="expired">Истёкшие</option>
                  <option value="cancelled">Отменённые</option>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Тариф</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Цена</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Срок действия</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Статус</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedSubscriptions.map((sub) => {
                    const statusInfo = getStatusInfo(sub.status);
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{sub.userName}</div>
                            <div className="text-xs text-gray-500">{sub.userEmail}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(sub.plan)}`}>
                            {sub.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                          {sub.price.toLocaleString()} ₸/мес
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sub.status === 'expired' && (
                              <button className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">
                                Продлить
                              </button>
                            )}
                            <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                              Изменить
                            </button>
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
                Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)} из {filteredSubscriptions.length}
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
        </>
      )}

      {activeTab === 'payments' && (
        <div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Пользователь</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Тариф</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Сумма</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{payment.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{payment.userName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(payment.plan)}`}>
                        {payment.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {payment.amount.toLocaleString()} ₸
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                        {getPaymentStatusText(payment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
