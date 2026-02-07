'use client';

import { ChevronLeft, Sun, Moon, Monitor, Check } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

type Theme = 'light' | 'dark' | 'system';

const themes: { key: Theme; label: string; description: string; icon: typeof Sun }[] = [
  {
    key: 'light',
    label: 'Светлая',
    description: 'Классическая светлая тема',
    icon: Sun,
  },
  {
    key: 'dark',
    label: 'Тёмная',
    description: 'Тёмная тема для комфорта глаз',
    icon: Moon,
  },
  {
    key: 'system',
    label: 'Системная',
    description: 'Автоматически по настройкам устройства',
    icon: Monitor,
  },
];

export default function AppearancePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/app/settings"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Назад к настройкам
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Внешний вид</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Настройки темы интерфейса</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Тема</h2>

          <div className="space-y-3">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.key;

              return (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {t.label}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Текущая тема: <span className="font-medium text-gray-900 dark:text-white">{resolvedTheme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
