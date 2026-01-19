'use client';

import { useState } from 'react';
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
  Phone,
  Building,
  Globe,
  Palette,
  Database,
  FileText,
  LogOut
} from 'lucide-react';
import Link from 'next/link';

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
        badge: 'Подключено',
        badgeColor: 'bg-emerald-100 text-emerald-700'
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
        href: '/app/settings/billing',
        color: 'bg-emerald-100 text-emerald-600',
        badge: 'Pro',
        badgeColor: 'bg-emerald-500 text-white'
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

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
          <p className="text-gray-500 mt-1">Управление аккаунтом, безопасностью и интеграциями</p>
        </motion.div>

        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              RM
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Robo Market</h2>
              <p className="text-gray-500">robo@example.com</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  Pro план
                </span>
                <span className="text-xs text-gray-400">Активен до 15.02.2026</span>
              </div>
            </div>
            <Link
              href="/app/settings/account"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
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
          className="space-y-8"
        >
          {settingsSections.map((section) => (
            <motion.div key={section.title} variants={itemVariants}>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
                {section.title}
              </h3>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                {section.items.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.title}</span>
                        {item.badge && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
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
          className="mt-8 flex items-center justify-between"
        >
          <Link
            href="/help"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Помощь и поддержка</span>
          </Link>
          <button
            className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Выйти из аккаунта</span>
          </button>
        </motion.div>

        {/* Version */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Версия 1.0.0 • © 2026 Kaspi Seller Dashboard
        </div>
      </div>
    </div>
  );
}
