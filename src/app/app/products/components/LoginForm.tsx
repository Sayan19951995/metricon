import { useState } from 'react';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';

interface LoginFormProps {
  userId: string;
  onSuccess: (session: { merchantId?: string; username?: string }) => void;
}

export default function LoginForm({ userId, onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Введите логин и пароль');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/kaspi/cabinet/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        onSuccess({ merchantId: data.merchantId, username: username || undefined });
      } else {
        setError(data.error || 'Не удалось подключиться');
      }
    } catch {
      setError('Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-gray-900 dark:text-white">Товары</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Управление товарами на Kaspi</p>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Подключите Kaspi кабинет</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Для управления товарами, ценами и предзаказами необходимо подключить
              ваш Kaspi Merchant Cabinet
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Логин (телефон или email)
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="+7 (777) 123-45-67"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Пароль от Kaspi кабинета"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#f14635] to-[#ff6b5a] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Подключение...
                </span>
              ) : (
                'Подключить кабинет'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
