'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, BarChart2 } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import Link from 'next/link';

export default function NotificationSettingsPage() {
  const [dailyReportEnabled, setDailyReportEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWithAuth('/api/store-settings').then(r => r.json()).then(data => {
      if (data?.data?.dailyReportEnabled !== undefined) {
        setDailyReportEnabled(data.data.dailyReportEnabled);
      }
    }).catch(() => {});
  }, []);

  async function toggleDailyReport() {
    const newValue = !dailyReportEnabled;
    setDailyReportEnabled(newValue);
    setSaving(true);
    try {
      await fetchWithAuth('/api/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyReportEnabled: newValue }),
      });
    } catch {
      setDailyReportEnabled(!newValue);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 to-slate-100 dark:from-gray-900 dark:to-gray-800 pt-16 lg:pt-0 lg:pl-64">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к настройкам
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Уведомления</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Управление уведомлениями</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Ежедневный отчёт</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Сводка продаж каждое утро в 7:00 по WhatsApp</p>
                </div>
              </div>
              <button
                onClick={toggleDailyReport}
                disabled={saving}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  dailyReportEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  dailyReportEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
