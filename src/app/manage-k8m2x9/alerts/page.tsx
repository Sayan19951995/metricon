'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { AlertTriangle, RefreshCw, Clock, CheckCircle, X } from 'lucide-react';
import type { ClientAlert } from '@/app/api/admin/alerts/route';

function formatMinutes(min: number): string {
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}ч ${m}м назад` : `${h}ч назад`;
}

const TYPE_LABELS: Record<string, string> = {
  marketing: 'Kaspi Маркетинг',
  cabinet: 'Kaspi Кабинет',
};

const TYPE_COLORS: Record<string, string> = {
  marketing: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  cabinet: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ClientAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dismissing, setDismissing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
      setLastRefresh(new Date());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function dismiss(storeId: string, type: string) {
    const key = `${storeId}-${type}`;
    setDismissing(key);
    try {
      await fetchWithAuth('/api/admin/alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, type }),
      });
      await load();
    } catch { /* ignore */ } finally {
      setDismissing(null);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 2 * 60 * 1000); // auto-refresh every 2 min
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            Алерты подключений
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Клиенты, у которых Kaspi переподключение не удалось — нужно попросить их переподключиться вручную
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Last refresh */}
      <p className="text-gray-500 text-xs mb-4 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Последнее обновление: {lastRefresh.toLocaleTimeString('ru-RU')} · обновляется каждые 2 мин
      </p>

      {loading && alerts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Загрузка...
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
          <p className="text-white font-medium text-lg">Всё в порядке</p>
          <p className="text-gray-400 text-sm mt-1">Проблем с подключениями не обнаружено</p>
        </div>
      ) : (
        <>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 text-sm font-medium">
              {alerts.length} проблем{alerts.length === 1 ? 'а' : alerts.length < 5 ? 'ы' : ''} с подключением
            </p>
            <p className="text-yellow-400/70 text-xs mt-1">
              Клиентам ниже нужно вручную переподключить Kaspi в настройках приложения
            </p>
          </div>

          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div
                key={`${alert.storeId}-${alert.type}-${idx}`}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{alert.userName}</span>
                    <span className="text-gray-400 text-sm truncate">{alert.userEmail}</span>
                  </div>
                  <div className="text-gray-400 text-sm mt-0.5">
                    Магазин: <span className="text-gray-300">{alert.storeName}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${TYPE_COLORS[alert.type]}`}>
                    {TYPE_LABELS[alert.type]}
                  </span>
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatMinutes(alert.minutesAgo)}
                  </span>
                  <button
                    onClick={() => dismiss(alert.storeId, alert.type)}
                    disabled={dismissing === `${alert.storeId}-${alert.type}`}
                    className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Очистить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
