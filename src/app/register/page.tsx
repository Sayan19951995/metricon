'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, BarChart3, CheckCircle, Building2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    storeName: '',
    password: '',
    confirmPassword: '',
    agree: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите ваше имя';
    }

    if (!formData.email) {
      newErrors.email = 'Введите email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }

    if (!formData.phone) {
      newErrors.phone = 'Введите номер телефона';
    } else if (!/^\+?[0-9]{10,12}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Введите корректный номер';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.storeName.trim()) {
      newErrors.storeName = 'Введите название магазина';
    }

    if (!formData.password) {
      newErrors.password = 'Введите пароль';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите пароль';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (!formData.agree) {
      newErrors.agree = 'Необходимо принять условия';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;

    setIsLoading(true);
    setErrors({});

    // Симуляция запроса к API
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock успешной регистрации
    router.push('/app');
  };

  const features = [
    '30 дней Pro доступа бесплатно',
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
              "За 3 месяца использования Metricon наши продажи выросли на 45%. Автоматизация цен экономит по 2 часа в день."
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
              <p className="text-gray-500">Шаг {step} из 2</p>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-2 mb-8">
              <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
              <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 1 && (
                <>
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
                        className="flex-1 py-3 pr-4 bg-transparent focus:outline-none"
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
                        className="flex-1 py-3 pr-4 bg-transparent focus:outline-none"
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
                      Телефон
                    </label>
                    <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                        <Phone className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="flex-1 py-3 pr-4 bg-transparent focus:outline-none"
                        placeholder="+7 777 123 45 67"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1.5 text-sm text-red-500">{errors.phone}</p>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Продолжить
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Store Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название магазина
                    </label>
                    <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all ${
                      errors.storeName ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={formData.storeName}
                        onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                        className="flex-1 py-3 pr-4 bg-transparent focus:outline-none"
                        placeholder="Мой магазин на Kaspi"
                      />
                    </div>
                    {errors.storeName && (
                      <p className="mt-1.5 text-sm text-red-500">{errors.storeName}</p>
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

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Подтвердите пароль
                    </label>
                    <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all ${
                      errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="flex-1 py-3 bg-transparent focus:outline-none"
                        placeholder="Повторите пароль"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="flex items-center justify-center w-12 h-12 flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-red-500">{errors.confirmPassword}</p>
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

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all cursor-pointer"
                    >
                      Назад
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          Создать аккаунт
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">или</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

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
