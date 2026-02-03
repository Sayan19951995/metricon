'use client';

import { motion } from 'framer-motion';
import {
  User,
  Key,
  Bell,
  Shield,
  CreditCard,
  Store,
  HelpCircle,
  ChevronRight,
  Mail,
  Building,
  Palette,
  Database,
  FileText,
  LogOut,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

const planNames: Record<string, string> = {
  start: 'Start',
  business: 'Business',
  pro: 'Pro',
};

export default function SettingsPage() {
  const { user, store, subscription, loading } = useUser();
  const router = useRouter();

  const displayName = store?.name || user?.name || 'Пользователь';
  const displayEmail = user?.email || '';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const currentPlan = subscription?.plan ? planNames[subscription.plan] || subscription.plan : 'Start';
  const planEndDate = subscription?.end_date
    ? new Date(subscription.end_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const kaspiConnected = !!(store?.kaspi_api_key || store?.kaspi_merchant_id);

  const settingsSections = [
    {
      title: 'Аккаунт',
      items: [
        {
          icon: User,
          title: 'Личные данные',
          description: 'Имя, email, телефон, аватар',
          href: '/app/settings/account',
          color: 'bg-blue-100 text-blue-600'
        },
        {
          icon: Key,
          title: 'Безопасность',
          description: 'Пароль, двухфакторная аутентификация',
          href: '/app/settings/account#security',
          color: 'bg-amber-100 text-amber-600'
        },
        {
          icon: Shield,
          title: 'Сессии и устройства',
          description: 'Активные сессии, выход со всех устройств',
          href: '/app/settings/account#sessions',
          color: 'bg-red-100 text-red-600'
        }
      ]
    },
    {
      title: 'Магазин',
      items: [
        {
          icon: Store,
          title: 'Подключение Kaspi',
          description: 'Интеграция с кабинетом продавца',
          href: '/app/settings/kaspi',
          color: 'bg-[#f14635]/10 text-[#f14635]',
          badge: kaspiConnected ? 'Подключено' : 'Не подключено',
          badgeColor: kaspiConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        },
        {
          icon: Users,
          title: 'Команда и роли',
          description: 'Управление доступом сотрудников',
          href: '/app/settings/team',
          color: 'bg-indigo-100 text-indigo-600'
        },
        {
          icon: Building,
          title: 'Данные компании',
          description: 'Реквизиты, юридические данные',
          href: '/app/settings/company',
          color: 'bg-purple-100 text-purple-600'
        },
        {
          icon: CreditCard,
          title: 'Подписка и оплата',
          description: 'Тарифный план, история платежей',
          href: '/app/subscription',
          color: 'bg-emerald-100 text-emerald-600',
          badge: currentPlan,
          badgeColor: subscription?.plan === 'pro' ? 'bg-emerald-500 text-white' : subscription?.plan === 'business' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
        }
      ]
    },
    {
      title: 'Уведомления',
      items: [
        {
          icon: Bell,
          title: 'Настройки уведомлений',
          description: 'Email, Push, Telegram',
          href: '/app/settings/notifications',
          color: 'bg-pink-100 text-pink-600'
        },
        {
          icon: Mail,
          title: 'Email рассылки',
          description: 'Отчёты, новости, обновления',
          href: '/app/settings/notifications#email',
          color: 'bg-indigo-100 text-indigo-600'
        }
      ]
    },
    {
      title: 'Система',
      items: [
        {
          icon: Palette,
          title: 'Внешний вид',
          description: 'Тема, язык интерфейса',
          href: '/app/settings/appearance',
          color: 'bg-cyan-100 text-cyan-600'
        },
        {
          icon: Database,
          title: 'Данные и экспорт',
          description: 'Экспорт данных, резервное копирование',
          href: '/app/settings/data',
          color: 'bg-gray-100 text-gray-600'
        },
        {
          icon: FileText,
          title: 'Журнал действий',
          description: 'История изменений в аккаунте',
          href: '/app/settings/activity',
          color: 'bg-orange-100 text-orange-600'
        }
      ]
    }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-16 lg:pt-0 lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 lg:mb-8">
              <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-72 bg-gray-200 rounded mt-2 animate-pulse" />
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-6 lg:mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="flex-1">
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-36 bg-gray-200 rounded mt-2 animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded-full mt-2 animate-pulse" />
                </div>
              </div>
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="mb-6">
                <div className="h-4 w-24 bg-gray-200 rounded mb-3 animate-pulse" />
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-center gap-4 p-4 border-b border-gray-50">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-48 bg-gray-200 rounded mt-1 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 lg:mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Настройки</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">Управление аккаунтом, безопасностью и интеграциями</p>
          </motion.div>

          {/* User Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-6 lg:mb-8"
          >
            {/* Mobile Layout */}
            <div className="sm:hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900 truncate">{displayName}</h2>
                  <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    {currentPlan} план
                  </span>
                  {planEndDate && (
                    <span className="text-xs text-gray-400">до {planEndDate}</span>
                  )}
                </div>
                <Link
                  href="/app/settings/account"
                  className="text-sm text-emerald-600 font-medium"
                >
                  Редактировать
                </Link>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                <p className="text-gray-500">{displayEmail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    {currentPlan} план
                  </span>
                  {planEndDate && (
                    <span className="text-xs text-gray-400">Активен до {planEndDate}</span>
                  )}
                </div>
              </div>
              <Link
                href="/app/settings/account"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer flex-shrink-0"
              >
                Редактировать
              </Link>
            </div>
          </motion.div>

          {/* Settings Sections */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 lg:space-y-8"
          >
            {settingsSections.map((section) => (
              <motion.div key={section.title} variants={itemVariants}>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3 px-1">
                  {section.title}
                </h3>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                  {section.items.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm sm:text-base">{item.title}</span>
                          {item.badge && (
                            <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{item.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Help & Logout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 lg:mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <Link
              href="/help"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer text-sm"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Помощь и поддержка</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors cursor-pointer text-sm"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Выйти из аккаунта</span>
            </button>
          </motion.div>

          {/* Version */}
          <div className="mt-6 lg:mt-8 text-center text-xs text-gray-400 pb-4">
            Версия 1.0.0 • © 2026 Metricon
          </div>
        </div>
      </div>
    </div>
  );
}
