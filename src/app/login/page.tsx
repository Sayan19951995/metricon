'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight, BarChart3, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    // Симуляция запроса к API
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock успешного входа
    if (formData.email === 'demo@kaspi.kz' && formData.password === 'demo123') {
      router.push('/app');
    } else {
      setErrors({ general: 'Неверный email или пароль' });
      setIsLoading(false);
    }
  };

  const features = [
    'Аналитика продаж в реальном времени',
    'Автоматизация цен и рекламы',
    'Управление складом и заказами',
    'Мониторинг конкурентов'
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
            Управляйте продажами<br />
            на Kaspi.kz эффективно
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

          <div className="flex items-center gap-8 pt-6">
            <div>
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-emerald-100 text-sm">Активных продавцов</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div>
              <div className="text-3xl font-bold text-white">2.5B ₸</div>
              <div className="text-emerald-100 text-sm">Оборот в месяц</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div>
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-emerald-100 text-sm">Uptime</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-emerald-100 text-sm">
          © 2025 Metricon. Все права защищены.
        </div>
      </div>

      {/* Right Side - Login Form */}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Добро пожаловать</h2>
              <p className="text-gray-500">Войдите в свой аккаунт</p>
            </div>

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="flex-1 py-3 pr-4 bg-transparent focus:outline-none"
                    placeholder="example@mail.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.email}</p>
                )}
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
                    className="flex-1 py-3 bg-transparent focus:outline-none"
                    placeholder="••••••••"
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

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.remember}
                    onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">Запомнить меня</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Забыли пароль?
                </Link>
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
                  <>
                    Войти
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-700 text-center mb-2 font-medium">Демо доступ:</p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <code className="px-2 py-1 bg-white rounded text-emerald-700 border border-emerald-200">demo@kaspi.kz</code>
                <code className="px-2 py-1 bg-white rounded text-emerald-700 border border-emerald-200">demo123</code>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">или</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Register Link */}
            <p className="text-center text-gray-600">
              Нет аккаунта?{' '}
              <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
