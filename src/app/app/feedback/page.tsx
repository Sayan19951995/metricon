'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Send,
  Star,
  Settings,
  Loader2,
  Save,
  BarChart3,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface FeedbackSettings {
  enabled: boolean;
  delay_minutes: number;
  poll_question: string;
  good_option: string;
  bad_option: string;
  good_response: string;
  bad_response: string;
  expire_hours: number;
}

interface FeedbackStats {
  totalSent: number;
  positive: number;
  negative: number;
  pending: number;
  reviewsSent: number;
  responseRate: number;
}

const defaultSettings: FeedbackSettings = {
  enabled: false,
  delay_minutes: 10,
  poll_question: 'Как вам заказ? Оцените пожалуйста',
  good_option: 'Отлично',
  bad_option: 'Плохо',
  good_response: 'Спасибо! Будем рады, если оставите отзыв:',
  bad_response: 'Нам жаль это слышать. Расскажите, что случилось?',
  expire_hours: 24,
};

export default function FeedbackPage() {
  const { user } = useUser();
  const [settings, setSettings] = useState<FeedbackSettings>(defaultSettings);
  const [stats, setStats] = useState<FeedbackStats>({
    totalSent: 0, positive: 0, negative: 0, pending: 0, reviewsSent: 0, responseRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/feedback/settings?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setSettings({ ...defaultSettings, ...data.data.settings });
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Load feedback settings error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/feedback/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...settings }),
      });
      const data = await res.json();
      if (data.success) {
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Save feedback settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    setSettings(newSettings);
    if (!user?.id) return;
    try {
      await fetch('/api/feedback/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...newSettings }),
      });
    } catch (err) {
      console.error('Toggle feedback error:', err);
    }
  };

  const updateSetting = (key: keyof FeedbackSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Обратная связь</h1>
          <p className="text-gray-500 mt-1">Автоматические опросы после выдачи заказа</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Настройки
          </button>
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              settings.enabled
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {settings.enabled ? 'Включено' : 'Выключено'}
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Send className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-sm text-gray-500">Отправлено</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalSent}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-sm text-gray-500">Положительных</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.positive}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <ThumbsDown className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm text-gray-500">Отрицательных</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.negative}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-sm text-gray-500">Отзывы</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.reviewsSent}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-sm text-gray-500">% ответов</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{stats.responseRate}%</div>
        </motion.div>
      </div>

      {/* Как это работает */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Как это работает</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-blue-600">1</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">Заказ выдан</div>
              <div className="text-sm text-gray-500">Kaspi отмечает заказ как выданный</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-amber-600">2</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">Ожидание {settings.delay_minutes} мин</div>
              <div className="text-sm text-gray-500">Задержка перед отправкой опроса</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-emerald-600">3</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">Опрос в WhatsApp</div>
              <div className="text-sm text-gray-500">Клиент выбирает "{settings.good_option}" или "{settings.bad_option}"</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-600">4</span>
            </div>
            <div>
              <div className="font-medium text-gray-900">Результат</div>
              <div className="text-sm text-gray-500">Ссылка на отзыв или вопрос "что случилось?"</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ожидающие */}
      {stats.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <span className="text-sm text-amber-700">
            <strong>{stats.pending}</strong> опросов в очереди на отправку
          </span>
        </div>
      )}

      {/* Настройки (раскрываемые) */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5"
        >
          <h2 className="text-lg font-semibold text-gray-900">Настройки опроса</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Задержка после выдачи (мин)
              </label>
              <input
                type="number"
                value={settings.delay_minutes}
                onChange={(e) => updateSetting('delay_minutes', parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                min={1}
                max={1440}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Срок ожидания ответа (часов)
              </label>
              <input
                type="number"
                value={settings.expire_hours}
                onChange={(e) => updateSetting('expire_hours', parseInt(e.target.value) || 24)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                min={1}
                max={168}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Вопрос опроса
            </label>
            <input
              type="text"
              value={settings.poll_question}
              onChange={(e) => updateSetting('poll_question', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Вариант "Хорошо"
              </label>
              <input
                type="text"
                value={settings.good_option}
                onChange={(e) => updateSetting('good_option', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Вариант "Плохо"
              </label>
              <input
                type="text"
                value={settings.bad_option}
                onChange={(e) => updateSetting('bad_option', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ответ на "Хорошо" (+ ссылки на отзывы автоматически)
            </label>
            <textarea
              value={settings.good_response}
              onChange={(e) => updateSetting('good_response', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ответ на "Плохо"
            </label>
            <textarea
              value={settings.bad_response}
              onChange={(e) => updateSetting('bad_response', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={2}
            />
          </div>

          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Сохранить настройки
            </button>
          )}
        </motion.div>
      )}

      {/* Превью опроса */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          Превью опроса
        </h2>
        <div className="max-w-sm mx-auto">
          <div className="bg-[#e7ffdb] rounded-2xl p-4 shadow-sm">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="font-medium text-gray-900 text-sm mb-3">{settings.poll_question}</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  <span className="text-sm text-gray-700">{settings.good_option}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  <span className="text-sm text-gray-700">{settings.bad_option}</span>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">0 голосов</div>
            </div>
          </div>
          <div className="mt-3 text-center text-xs text-gray-400">
            Так будет выглядеть опрос в WhatsApp
          </div>
        </div>
      </motion.div>
    </div>
  );
}
