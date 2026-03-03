'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Mail, RefreshCw } from 'lucide-react';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError('');

    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error || 'Не удалось отправить письмо');
      } else {
        setResent(true);
        setTimeout(() => setResent(false), 5000);
        // 60 second cooldown
        setCooldown(60);
        const interval = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setError('Ошибка при отправке');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Проверьте почту</h2>
          <p className="text-gray-500 mb-6">
            Мы отправили письмо с подтверждением на{' '}
            {email ? (
              <span className="font-medium text-gray-700">{email}</span>
            ) : (
              'ваш email'
            )}
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-emerald-800">
              Нажмите на ссылку в письме, чтобы подтвердить аккаунт и начать работу.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {resent && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm">
              Письмо отправлено повторно
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resending || !email || cooldown > 0}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-4"
          >
            {resending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {cooldown > 0 ? `Повторить через ${cooldown} сек.` : 'Отправить повторно'}
          </button>

          <Link
            href="/login"
            className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
          >
            Войти в аккаунт
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
