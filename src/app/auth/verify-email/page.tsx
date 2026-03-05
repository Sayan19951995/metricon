'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { BarChart3, CheckCircle } from 'lucide-react';

function setSessionCookie() {
  document.cookie = 'metricon-session=1; path=/; max-age=7776000; samesite=strict';
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (tokenHash && type === 'signup') {
      // Verify via OTP token from query params (our custom email link)
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'signup',
      }).then(({ error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message || 'Ошибка подтверждения email');
          return;
        }
        setVerified(true);
        setSessionCookie();
        setTimeout(() => router.push('/app'), 1500);
      });
    } else {
      // Fallback: check if Supabase put tokens in hash fragment
      const hash = window.location.hash.substring(1);
      if (hash && hash.includes('access_token')) {
        // Supabase client will auto-detect hash tokens
        const checkSession = async () => {
          // Small delay for Supabase to process hash
          await new Promise(r => setTimeout(r, 500));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setVerified(true);
            setSessionCookie();
            setTimeout(() => router.push('/app'), 1500);
            return;
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              setVerified(true);
              setSessionCookie();
              setTimeout(() => router.push('/app'), 1500);
              subscription.unsubscribe();
            }
          });

          setTimeout(() => {
            setError('Не удалось подтвердить email. Попробуйте войти через страницу входа.');
          }, 5000);
        };
        checkSession();
      } else {
        setError('Ссылка подтверждения недействительна. Попробуйте войти через страницу входа.');
      }
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          {verified ? (
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          ) : (
            <BarChart3 className="w-8 h-8 text-emerald-600" />
          )}
        </div>
        {error ? (
          <>
            <p className="text-red-600 mb-4">{error}</p>
            <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Перейти ко входу
            </a>
          </>
        ) : verified ? (
          <>
            <p className="text-emerald-600 font-medium text-lg mb-2">Email подтвержден!</p>
            <p className="text-gray-500">Перенаправляем...</p>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Подтверждаем email...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
