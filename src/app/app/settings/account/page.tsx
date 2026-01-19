'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Camera,
  Key,
  Shield,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

type TabType = 'profile' | 'security' | 'sessions';

// Mock активные сессии
const activeSessions = [
  {
    id: 1,
    device: 'Chrome на Windows',
    icon: Monitor,
    location: 'Алматы, Казахстан',
    ip: '178.91.xxx.xxx',
    lastActive: 'Сейчас активен',
    current: true
  },
  {
    id: 2,
    device: 'Safari на iPhone',
    icon: Smartphone,
    location: 'Алматы, Казахстан',
    ip: '178.91.xxx.xxx',
    lastActive: '2 часа назад',
    current: false
  },
  {
    id: 3,
    device: 'Chrome на MacBook',
    icon: Monitor,
    location: 'Астана, Казахстан',
    ip: '95.57.xxx.xxx',
    lastActive: 'Вчера, 18:45',
    current: false
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    storeName: 'Robo Market',
    email: 'robo@example.com',
    phone: '+7 (777) 123-45-67',
    firstName: 'Роберт',
    lastName: 'Иванов'
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handlePasswordChange = () => {
    // Simulate password change
    setPasswordChanged(true);
    setTimeout(() => {
      setShowPasswordModal(false);
      setPasswordChanged(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к настройкам
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Настройки аккаунта</h1>
          <p className="text-gray-500 mt-1">Управление профилем, паролем и безопасностью</p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 mb-6"
        >
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Профиль
            </span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Безопасность
            </span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Сессии
            </span>
          </button>
        </motion.div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Avatar Section */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Фото профиля</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                    RM
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
                    <Camera className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">JPG, PNG или GIF. Максимум 2MB.</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors cursor-pointer">
                      Загрузить
                    </button>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer">
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Personal Info */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Личная информация</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия</label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Контактная информация</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Используется для входа и уведомлений</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Store Info */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Название магазина</h3>
              <input
                type="text"
                value={profileForm.storeName}
                onChange={(e) => setProfileForm({...profileForm, storeName: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">Отображается в системе и отчётах</p>
            </motion.div>

            {/* Save Button */}
            <motion.div variants={itemVariants} className="flex justify-end">
              <button className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors cursor-pointer">
                Сохранить изменения
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Password Section */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Пароль</h3>
                  <p className="text-sm text-gray-500">Последнее изменение: 15 дней назад</p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors cursor-pointer"
                >
                  Изменить пароль
                </button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Рекомендация по безопасности</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Используйте уникальный пароль длиной не менее 12 символов с цифрами и специальными символами.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Two-Factor Authentication */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    twoFactorEnabled ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    <Shield className={`w-6 h-6 ${twoFactorEnabled ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Двухфакторная аутентификация</h3>
                    <p className="text-sm text-gray-500">
                      {twoFactorEnabled
                        ? 'Включена через приложение аутентификации'
                        : 'Дополнительный уровень защиты вашего аккаунта'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (twoFactorEnabled) {
                      setTwoFactorEnabled(false);
                    } else {
                      setShowTwoFactorModal(true);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    twoFactorEnabled
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {twoFactorEnabled ? 'Отключить' : 'Включить'}
                </button>
              </div>
            </motion.div>

            {/* Login History */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">История входов</h3>
              <div className="space-y-3">
                {[
                  { date: 'Сегодня, 10:23', location: 'Алматы, Казахстан', device: 'Chrome, Windows', success: true },
                  { date: 'Вчера, 18:45', location: 'Астана, Казахстан', device: 'Safari, macOS', success: true },
                  { date: '15.01.2026, 09:12', location: 'Алматы, Казахстан', device: 'Chrome, Windows', success: true },
                  { date: '14.01.2026, 22:30', location: 'Неизвестно', device: 'Firefox, Linux', success: false },
                ].map((login, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${login.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{login.date}</p>
                        <p className="text-xs text-gray-500">{login.device}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      {login.location}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Active Sessions */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Активные сессии</h3>
                <button className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors cursor-pointer">
                  Завершить все сессии
                </button>
              </div>
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className={`flex items-center justify-between p-4 rounded-xl ${
                    session.current ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        session.current ? 'bg-emerald-100' : 'bg-gray-200'
                      }`}>
                        <session.icon className={`w-5 h-5 ${session.current ? 'text-emerald-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{session.device}</p>
                          {session.current && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                              Текущая
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.location}
                          </span>
                          <span>IP: {session.ip}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {session.lastActive}
                        </div>
                      </div>
                      {!session.current && (
                        <button className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Security Notice */}
            <motion.div variants={itemVariants} className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Совет:</strong> Если вы видите незнакомые устройства, рекомендуется изменить пароль и завершить все сессии.
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* Password Change Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPasswordModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Изменить пароль</h3>
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {passwordChanged ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Пароль изменён</h4>
                      <p className="text-gray-500">Используйте новый пароль при следующем входе</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Текущий пароль</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordForm.current}
                            onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors pr-10"
                            placeholder="Введите текущий пароль"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Новый пароль</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.new}
                            onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors pr-10"
                            placeholder="Введите новый пароль"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Подтвердите пароль</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordForm.confirm}
                            onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors pr-10"
                            placeholder="Повторите новый пароль"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setShowPasswordModal(false)}
                          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handlePasswordChange}
                          className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors cursor-pointer"
                        >
                          Изменить пароль
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Two-Factor Modal */}
        <AnimatePresence>
          {showTwoFactorModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowTwoFactorModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Настройка 2FA</h3>
                    <button
                      onClick={() => setShowTwoFactorModal(false)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-center mb-6">
                    <div className="w-48 h-48 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                      <div className="text-gray-400 text-sm">QR код</div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Отсканируйте QR-код в приложении аутентификации (Google Authenticator, Authy)
                    </p>
                    <p className="text-xs text-gray-400">
                      Или введите код вручную: XXXX-XXXX-XXXX-XXXX
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Код подтверждения</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-center tracking-widest focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowTwoFactorModal(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => {
                        setTwoFactorEnabled(true);
                        setShowTwoFactorModal(false);
                      }}
                      className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors cursor-pointer"
                    >
                      Подтвердить
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
