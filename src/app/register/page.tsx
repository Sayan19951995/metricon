'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, Phone, User, BarChart3, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { captureUTM, getUTM, clearUTM } from '@/lib/utm';

// Устанавливает индикаторную куку, которую читает middleware
function setSessionCookie() {
  document.cookie = 'metricon-session=1; path=/; max-age=604800; samesite=strict';
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    agree: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { captureUTM(); }, []);

  // Слушаем событие входа (для OAuth редиректа с #access_token в хэше)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        clearUTM();
        setSessionCookie();
        router.push('/app');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите ваше имя';
    }

    if (!formData.email) {
      newErrors.email = 'Введите email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }

    if (!formData.password) {
      newErrors.password = 'Введите пароль';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }

    if (!formData.agree) {
      newErrors.agree = 'Необходимо принять условия';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const utm = getUTM();

      // Register via server-side API (bypasses RLS)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone ? `+7${formData.phone}` : undefined,
          utm,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Ошибка при регистрации');
      }

      // Sign in after successful registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      clearUTM();
      setSessionCookie();
      router.push('/app');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка при регистрации';
      setErrors({ general: message });
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка входа через Google';
      setErrors({ general: message });
      setIsGoogleLoading(false);
    }
  };

  const features = [
    '14 дней Pro доступа бесплатно',
    'Интеграция с Kaspi API',
    'Техническая поддержка 24/7',
    'Обучающие материалы'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-500 to-emerald-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full"></div>
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Metricon</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Начните продавать<br />
            эффективнее уже сегодня
          </h1>

          <div className="space-y-4">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-emerald-50">{feature}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mt-8">
            <p className="text-white/90 italic mb-4">
              &quot;За 3 месяца использования Metricon наши продажи выросли на 45%. Автоматизация цен экономит по 2 часа в день.&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold">
                АК
              </div>
              <div>
                <div className="text-white font-medium">Асхат Калиев</div>
                <div className="text-emerald-100 text-sm">TechStore Almaty</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-emerald-100 text-sm">
          © 2025 Metricon. Все права защищены.
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Metricon</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Создать аккаунт</h2>
              <p className="text-gray-500">Заполните данные для регистрации</p>
            </div>

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center">
                {errors.general}
              </div>
            )}

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full py-3.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Войти через Google
                </>
              )}
            </button>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">или</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ваше имя
                </label>
                <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="flex-1 py-3 pr-4 bg-transparent focus:outline-none text-gray-900"
                    placeholder="Иван Петров"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="flex-1 py-3 pr-4 bg-transparent focus:outline-none text-gray-900"
                    placeholder="example@mail.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер телефона <span className="text-gray-400 font-normal">(необязательно)</span>
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
                  <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-gray-900 font-medium select-none whitespace-nowrap pl-1">+7</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: digits });
                    }}
                    className="flex-1 py-3 pr-4 pl-1 bg-transparent focus:outline-none text-gray-900"
                    placeholder="7001234567"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль
                </label>
                <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="flex-1 py-3 bg-transparent focus:outline-none text-gray-900"
                    placeholder="Минимум 6 символов"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center justify-center w-12 h-12 flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Agree Checkbox */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agree}
                    onChange={(e) => setFormData({ ...formData, agree: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">
                    Я согласен с{' '}
                    <Link href="/terms" className="text-emerald-600 hover:underline">
                      условиями использования
                    </Link>{' '}
                    и{' '}
                    <Link href="/privacy" className="text-emerald-600 hover:underline">
                      политикой конфиденциальности
                    </Link>
                  </span>
                </label>
                {errors.agree && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.agree}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Создать аккаунт'
                )}
              </button>
            </form>

            <div className="mt-6"></div>

            {/* Login Link */}
            <p className="text-center text-gray-600">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
