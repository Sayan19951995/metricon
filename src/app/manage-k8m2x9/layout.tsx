'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, Lock } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import AdminSidebar from './components/AdminSidebar';

const PIN_SESSION_KEY = 'admin-pin-verified';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Check if PIN was already verified this session
  useEffect(() => {
    if (sessionStorage.getItem(PIN_SESSION_KEY) === 'true') {
      setPinVerified(true);
    }
  }, []);

  useEffect(() => {
    if (userLoading || !user?.id) return;

    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setIsAdmin(!!(data as any)?.is_admin);
      });
  }, [user?.id, userLoading]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinValue.trim()) return;

    setPinLoading(true);
    setPinError('');

    try {
      const res = await fetchWithAuth('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });

      if (res.ok) {
        sessionStorage.setItem(PIN_SESSION_KEY, 'true');
        setPinVerified(true);
      } else {
        setPinError('Неверный PIN-код');
        setPinValue('');
        inputRef.current?.focus();
      }
    } catch {
      setPinError('Ошибка проверки');
    } finally {
      setPinLoading(false);
    }
  };

  if (userLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-sm max-w-sm text-center border border-gray-700">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Нет доступа</h2>
          <p className="text-gray-400 text-sm mb-4">У вас нет прав администратора</p>
          <button
            onClick={() => router.push('/app')}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Вернуться в приложение
          </button>
        </div>
      </div>
    );
  }

  // PIN gate
  if (!pinVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <form onSubmit={handlePinSubmit} className="bg-gray-800 rounded-2xl p-8 shadow-sm max-w-sm w-full text-center border border-gray-700">
          <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Введите PIN-код</h2>
          <p className="text-gray-400 text-sm mb-6">Для доступа к панели управления</p>
          <input
            ref={inputRef}
            type="password"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            placeholder="PIN-код"
            autoFocus
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white text-center text-lg tracking-widest placeholder-gray-500 focus:outline-none focus:border-green-500 mb-4"
          />
          {pinError && (
            <p className="text-red-400 text-sm mb-4">{pinError}</p>
          )}
          <button
            type="submit"
            disabled={pinLoading || !pinValue.trim()}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {pinLoading ? 'Проверка...' : 'Войти'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
