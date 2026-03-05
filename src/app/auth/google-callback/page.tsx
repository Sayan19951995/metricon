'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { BarChart3 } from 'lucide-react';

function setSessionCookie() {
  document.cookie = 'metricon-session=1; path=/; max-age=7776000; samesite=strict';
}

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');

    if (!idToken) {
      setError('Токен не получен. Попробуйте ещё раз.');
      return;
    }

    supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    }).then(({ error: authError }) => {
      if (authError) {
        console.error('signInWithIdToken error:', authError);
        setError(authError.message || 'Ошибка авторизации');
        return;
      }
      setSessionCookie();
      router.push('/app');
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        {error ? (
          <>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Вернуться ко входу
            </a>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Вход через Google...</p>
          </>
        )}
      </div>
    </div>
  );
}
