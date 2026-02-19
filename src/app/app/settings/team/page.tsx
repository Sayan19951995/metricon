'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Shield,
  Eye,
  Edit3,
  Trash2,
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
    color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400',
    icon: Crown
  },
  admin: {
    name: 'Администратор',
    description: 'Полный доступ кроме биллинга и удаления аккаунта',
    color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400',
    icon: ShieldCheck
  },
  manager: {
    name: 'Менеджер',
    description: 'Заказы, товары, склад. Без доступа к финансам',
    color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400',
    icon: Edit3
  },
  warehouse: {
    name: 'Кладовщик',
    description: 'Только склад: приёмка, остатки, перемещения',
    color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400',
    icon: Package
  },
  viewer: {
    name: 'Наблюдатель',
    description: 'Только просмотр данных без редактирования',
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
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

// Лимиты по тарифам
const planLimits = {
  start: { roles: 1, name: 'Старт' },
  business: { roles: 3, name: 'Бизнес' },
  pro: { roles: 10, name: 'Pro' }
};

export default function TeamSettingsPage() {
  const { user, subscription } = useUser();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleType>('viewer');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentPlan = (subscription?.plan as 'start' | 'business' | 'pro') || 'start';
  const maxRoles = planLimits[currentPlan]?.roles || 1;
  const currentRolesCount = teamMembers.filter(m => m.role !== 'owner').length;
  const canAddMore = currentRolesCount < maxRoles;

  // Загрузка участников из API
  const loadMembers = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/team?userId=${user.id}`);
      const json = await res.json();
      if (json.success) {
        // Владелец как первый элемент
        const ownerMember: TeamMember = {
          id: 'owner',
          name: user.name || user.email.split('@')[0],
          email: user.email,
          avatar: (user.name || user.email).substring(0, 2).toUpperCase(),
          role: 'owner',
          status: 'active',
        };
        const apiMembers: TeamMember[] = (json.data || []).map((m: any) => ({
          id: m.id,
          name: m.name || m.email.split('@')[0],
          email: m.email,
          avatar: (m.name || m.email).substring(0, 2).toUpperCase(),
          role: m.role as RoleType,
          status: m.status as 'active' | 'pending' | 'inactive',
          invitedAt: m.created_at ? new Date(m.created_at).toLocaleDateString('ru-RU') : undefined,
        }));
        setTeamMembers([ownerMember, ...apiMembers]);
      }
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.name, user?.email]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail || !canAddMore || !user?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await loadMembers();
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('viewer');
      } else {
        alert(json.message || 'Ошибка');
      }
    } catch (err) {
      console.error('Invite error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: RoleType) => {
    if (!user?.id) return;
    // Optimistic update
    setTeamMembers(prev =>
      prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)
    );
    setShowRoleModal(false);
    setSelectedMember(null);

    try {
      await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, memberId, role: newRole }),
      });
    } catch (err) {
      console.error('Change role error:', err);
      await loadMembers(); // revert on error
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user?.id || !confirm('Удалить участника?')) return;
    setActiveDropdown(null);
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));

    try {
      await fetch(`/api/team?userId=${user.id}&memberId=${memberId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Remove error:', err);
      await loadMembers();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Назад к настройкам</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Команда и роли</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Управление доступом сотрудников</p>
            </div>
            <button
              onClick={() => canAddMore ? setShowInviteModal(true) : null}
              disabled={!canAddMore}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                canAddMore
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Пригласить
            </button>
          </div>
        </div>

        {/* Plan Limit Banner */}
        <div
          className={`rounded-xl lg:rounded-2xl p-4 lg:p-5 mb-6 ${
            canAddMore ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <div className="flex items-start gap-3 lg:gap-4">
            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0 ${
              canAddMore ? 'bg-emerald-100 dark:bg-emerald-800' : 'bg-amber-100 dark:bg-amber-800'
            }`}>
              <Users className={`w-4 h-4 lg:w-5 lg:h-5 ${canAddMore ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentRolesCount} из {maxRoles} сотрудников
                </span>
                <span className="px-2 py-0.5 bg-white dark:bg-gray-800 rounded text-xs font-medium text-gray-600 dark:text-gray-300">
                  {planLimits[currentPlan].name}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {canAddMore
                  ? `Вы можете добавить ещё ${maxRoles - currentRolesCount} сотрудников`
                  : 'Достигнут лимит сотрудников. Перейдите на Pro для добавления до 5 ролей.'}
              </p>
              {!canAddMore && (
                <Link
                  href="/app/subscription"
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
                >
                  Улучшить план
                  <ArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 lg:p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white lg:text-lg">Участники команды</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 lg:p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                      <span className="font-medium text-gray-900 dark:text-white truncate">{member.name}</span>
                      {member.role === 'owner' && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                      {member.status === 'pending' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs rounded">
                          <Clock className="w-3 h-3" />
                          Ожидает
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
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
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>

                      <AnimatePresence>
                        {activeDropdown === member.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-10"
                          >
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setShowRoleModal(true);
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Shield className="w-4 h-4" />
                              Изменить роль
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
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
              </div>
            ))}
          </div>
        </div>

        {/* Roles Description */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 lg:p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white lg:text-lg">Описание ролей</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
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
                      <h3 className="font-medium text-gray-900 dark:text-white lg:text-lg">{name}</h3>
                      <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2">{description}</p>
                      <div className="flex flex-wrap gap-1.5 lg:gap-2">
                        {permissions.map((perm, i) => (
                          <span key={i} className="px-2 py-0.5 lg:px-2.5 lg:py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs lg:text-sm rounded lg:rounded-lg">
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
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Пригласить сотрудника</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Имя
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Имя сотрудника"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                                : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">{name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
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
                    disabled={!inviteEmail || saving}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 text-white rounded-xl font-medium transition-colors"
                  >
                    {saving ? 'Сохранение...' : 'Добавить'}
                  </button>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
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
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Изменить роль</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
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
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                            : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
                        </div>
                        {selectedMember.role === role && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Текущая</span>
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
                  className="w-full mt-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
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
