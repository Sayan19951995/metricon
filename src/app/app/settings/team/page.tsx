'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Shield,
  Eye,
  Edit3,
  Trash2,
  Mail,
  MoreVertical,
  Crown,
  Check,
  X,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Package
} from 'lucide-react';

// Типы ролей
type RoleType = 'owner' | 'admin' | 'manager' | 'warehouse' | 'viewer';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: RoleType;
  status: 'active' | 'pending' | 'inactive';
  lastActive?: string;
  invitedAt?: string;
}

// Описание ролей
const roleDescriptions: Record<RoleType, { name: string; description: string; color: string; icon: typeof Shield }> = {
  owner: {
    name: 'Владелец',
    description: 'Полный доступ, управление командой и биллингом',
    color: 'bg-amber-100 text-amber-700',
    icon: Crown
  },
  admin: {
    name: 'Администратор',
    description: 'Полный доступ кроме биллинга и удаления аккаунта',
    color: 'bg-purple-100 text-purple-700',
    icon: ShieldCheck
  },
  manager: {
    name: 'Менеджер',
    description: 'Заказы, товары, склад. Без доступа к финансам',
    color: 'bg-blue-100 text-blue-700',
    icon: Edit3
  },
  warehouse: {
    name: 'Кладовщик',
    description: 'Только склад: приёмка, остатки, перемещения',
    color: 'bg-orange-100 text-orange-700',
    icon: Package
  },
  viewer: {
    name: 'Наблюдатель',
    description: 'Только просмотр данных без редактирования',
    color: 'bg-gray-100 text-gray-700',
    icon: Eye
  }
};

// Права доступа по ролям
const rolePermissions: Record<RoleType, string[]> = {
  owner: [
    'Управление командой и ролями',
    'Биллинг и подписка',
    'Все настройки аккаунта',
    'Полный доступ к данным',
    'Удаление аккаунта'
  ],
  admin: [
    'Управление командой',
    'Все настройки магазина',
    'Полный доступ к данным',
    'Экспорт отчётов'
  ],
  manager: [
    'Управление заказами',
    'Управление товарами',
    'Управление складом',
    'Просмотр аналитики'
  ],
  warehouse: [
    'Приёмка товаров',
    'Редактирование остатков',
    'Перемещение между складами',
    'История приёмок'
  ],
  viewer: [
    'Просмотр дашборда',
    'Просмотр заказов',
    'Просмотр товаров',
    'Просмотр аналитики'
  ]
};

// Mock данные команды
const initialTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Саян Муратов',
    email: 'sayan@luxstone.kz',
    avatar: 'СМ',
    role: 'owner',
    status: 'active',
    lastActive: '2 минуты назад'
  },
  {
    id: '2',
    name: 'Айгерим Касымова',
    email: 'aigerim@luxstone.kz',
    avatar: 'АК',
    role: 'manager',
    status: 'active',
    lastActive: '1 час назад'
  },
  {
    id: '3',
    name: 'Арман Жумабеков',
    email: 'arman@gmail.com',
    avatar: 'АЖ',
    role: 'viewer',
    status: 'pending',
    invitedAt: '15.01.2025'
  }
];

// Лимиты по тарифам
const planLimits = {
  start: { roles: 0, name: 'Старт' },
  business: { roles: 2, name: 'Бизнес' },
  pro: { roles: 5, name: 'Pro' }
};

export default function TeamSettingsPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleType>('viewer');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Текущий план (mock)
  const currentPlan: 'start' | 'business' | 'pro' = 'business';
  const maxRoles = planLimits[currentPlan].roles;
  const currentRolesCount = teamMembers.filter(m => m.role !== 'owner').length;
  const canAddMore = currentRolesCount < maxRoles;

  const handleInvite = () => {
    if (!inviteEmail || !canAddMore) return;

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      avatar: inviteEmail.substring(0, 2).toUpperCase(),
      role: inviteRole,
      status: 'pending',
      invitedAt: new Date().toLocaleDateString('ru-RU')
    };

    setTeamMembers(prev => [...prev, newMember]);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('viewer');
  };

  const handleChangeRole = (memberId: string, newRole: RoleType) => {
    setTeamMembers(prev =>
      prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)
    );
    setShowRoleModal(false);
    setSelectedMember(null);
  };

  const handleRemoveMember = (memberId: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    setActiveDropdown(null);
  };

  const handleResendInvite = (memberId: string) => {
    // Mock resend
    alert('Приглашение отправлено повторно');
    setActiveDropdown(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Назад к настройкам</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Команда и роли</h1>
              <p className="text-gray-500 text-sm mt-1">Управление доступом сотрудников</p>
            </div>
            <button
              onClick={() => canAddMore ? setShowInviteModal(true) : null}
              disabled={!canAddMore}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                canAddMore
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Пригласить
            </button>
          </div>
        </div>

        {/* Plan Limit Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl lg:rounded-2xl p-4 lg:p-5 mb-6 ${
            canAddMore ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3 lg:gap-4">
            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0 ${
              canAddMore ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              <Users className={`w-4 h-4 lg:w-5 lg:h-5 ${canAddMore ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {currentRolesCount} из {maxRoles} сотрудников
                </span>
                <span className="px-2 py-0.5 bg-white rounded text-xs font-medium text-gray-600">
                  {planLimits[currentPlan].name}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {canAddMore
                  ? `Вы можете добавить ещё ${maxRoles - currentRolesCount} сотрудников`
                  : 'Достигнут лимит сотрудников. Перейдите на Pro для добавления до 5 ролей.'}
              </p>
              {!canAddMore && (
                <Link
                  href="/app/subscription"
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  Улучшить план
                  <ArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* Team Members List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 lg:p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 lg:text-lg">Участники команды</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 lg:p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 lg:gap-4">
                  {/* Avatar */}
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-white font-medium lg:text-lg flex-shrink-0 ${
                    member.role === 'owner' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                    member.role === 'admin' ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                    member.role === 'manager' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                    'bg-gradient-to-br from-gray-400 to-gray-600'
                  }`}>
                    {member.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{member.name}</span>
                      {member.role === 'owner' && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                      {member.status === 'pending' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                          <Clock className="w-3 h-3" />
                          Ожидает
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{member.email}</p>
                  </div>

                  {/* Role Badge */}
                  <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${roleDescriptions[member.role].color}`}>
                    {(() => {
                      const IconComponent = roleDescriptions[member.role].icon;
                      return <IconComponent className="w-3.5 h-3.5" />;
                    })()}
                    {roleDescriptions[member.role].name}
                  </div>

                  {/* Actions */}
                  {member.role !== 'owner' && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>

                      <AnimatePresence>
                        {activeDropdown === member.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10"
                          >
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setShowRoleModal(true);
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Shield className="w-4 h-4" />
                              Изменить роль
                            </button>
                            {member.status === 'pending' && (
                              <button
                                onClick={() => handleResendInvite(member.id)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Mail className="w-4 h-4" />
                                Отправить повторно
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Удалить
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Mobile Role Badge */}
                <div className={`sm:hidden mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${roleDescriptions[member.role].color}`}>
                  {(() => {
                    const IconComponent = roleDescriptions[member.role].icon;
                    return <IconComponent className="w-3.5 h-3.5" />;
                  })()}
                  {roleDescriptions[member.role].name}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Roles Description */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 lg:p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 lg:text-lg">Описание ролей</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(Object.keys(roleDescriptions) as RoleType[]).map((role) => {
              const { name, description, color, icon: Icon } = roleDescriptions[role];
              const permissions = rolePermissions[role];

              return (
                <div key={role} className="p-4 lg:p-5">
                  <div className="flex items-start gap-3 lg:gap-4">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 lg:text-lg">{name}</h3>
                      <p className="text-sm lg:text-base text-gray-500 mb-2">{description}</p>
                      <div className="flex flex-wrap gap-1.5 lg:gap-2">
                        {permissions.map((perm, i) => (
                          <span key={i} className="px-2 py-0.5 lg:px-2.5 lg:py-1 bg-gray-100 text-gray-600 text-xs lg:text-sm rounded lg:rounded-lg">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Пригласить сотрудника</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Роль
                    </label>
                    <div className="space-y-2">
                      {(['admin', 'manager', 'warehouse', 'viewer'] as RoleType[]).map((role) => {
                        const { name, description, color, icon: Icon } = roleDescriptions[role];
                        return (
                          <button
                            key={role}
                            onClick={() => setInviteRole(role)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                              inviteRole === role
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium text-gray-900">{name}</div>
                              <div className="text-xs text-gray-500">{description}</div>
                            </div>
                            {inviteRole === role && (
                              <Check className="w-5 h-5 text-emerald-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors"
                  >
                    Отправить приглашение
                  </button>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Change Role Modal */}
        <AnimatePresence>
          {showRoleModal && selectedMember && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-2">Изменить роль</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Выберите новую роль для {selectedMember.name}
                </p>

                <div className="space-y-2">
                  {(['admin', 'manager', 'warehouse', 'viewer'] as RoleType[]).map((role) => {
                    const { name, description, color, icon: Icon } = roleDescriptions[role];
                    return (
                      <button
                        key={role}
                        onClick={() => handleChangeRole(selectedMember.id, role)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          selectedMember.role === role
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium text-gray-900">{name}</div>
                          <div className="text-xs text-gray-500">{description}</div>
                        </div>
                        {selectedMember.role === role && (
                          <span className="text-xs text-emerald-600 font-medium">Текущая</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedMember(null);
                  }}
                  className="w-full mt-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Отмена
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
