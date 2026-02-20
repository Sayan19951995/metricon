'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Send,
  Clock,
  CheckCircle2,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  Edit3,
  MessageSquare,
  TrendingUp,
  X,
  ChevronDown,
  Eye,
  AlertTriangle,
  Bell,
  Package,
  Truck,
  Star,
  ShoppingCart,
  Loader2,
  Smartphone,
  Wifi,
  WifiOff,
  QrCode,
  SendHorizontal
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import Image from 'next/image';

type MailingStatus = 'active' | 'paused' | 'draft';
type ModalType = 'create' | 'edit' | 'templates' | 'settings' | 'delete' | 'preview' | null;

interface Mailing {
  id: string;
  name: string;
  trigger_type: string;
  subject: string | null;
  template_ru: string | null;
  status: string | null;
  sent_count: number | null;
  delivered_count: number | null;
  opened_count: number | null;
  last_sent_at: string | null;
  created_at: string | null;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

interface MailingSettings {
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  sendTime?: string;
  maxPerDay?: number;
  enabled?: boolean;
}

const triggerOptions = [
  { value: 'order_created', label: 'При создании заказа', icon: ShoppingCart },
  { value: 'order_shipped', label: 'При отправке заказа', icon: Truck },
  { value: 'order_delivered', label: 'При доставке заказа', icon: Package },
  { value: 'review_request', label: 'Запрос отзыва (через 7 дней)', icon: Star },
  { value: 'cart_abandoned', label: 'Брошенная корзина (через 24ч)', icon: ShoppingCart },
  { value: 'custom', label: 'Пользовательский триггер', icon: Bell },
];

const triggerLabels: Record<string, string> = {
  order_created: 'При создании заказа',
  order_shipped: 'При отправке заказа',
  order_delivered: 'При доставке заказа',
  review_request: 'Запрос отзыва (через 7 дней)',
  cart_abandoned: 'Брошенная корзина (через 24ч)',
  custom: 'Пользовательский триггер',
};

const defaultTemplates: Template[] = [
  {
    id: 1,
    name: 'Подтверждение заказа',
    subject: 'Ваш заказ #{order_id} принят',
    content: 'Здравствуйте, {customer_name}!\n\nВаш заказ #{order_id} успешно создан и принят в обработку.\n\nСостав заказа:\n{order_items}\n\nСумма: {order_total} ₸\n\nСпасибо за покупку!\n{shop_name}',
    variables: ['order_id', 'customer_name', 'order_items', 'order_total', 'shop_name']
  },
  {
    id: 2,
    name: 'Заказ отправлен',
    subject: 'Ваш заказ #{order_id} отправлен',
    content: 'Здравствуйте, {customer_name}!\n\nВаш заказ #{order_id} отправлен.\n\nТрек-номер: {tracking_number}\nОриентировочная дата доставки: {delivery_date}\n\nСпасибо за покупку!\n{shop_name}',
    variables: ['order_id', 'customer_name', 'tracking_number', 'delivery_date', 'shop_name']
  },
  {
    id: 3,
    name: 'Запрос отзыва',
    subject: 'Оставьте отзыв о покупке',
    content: 'Здравствуйте, {customer_name}!\n\nНадеемся, вам понравилась покупка!\n\nБудем благодарны, если вы оставите отзыв о товаре:\n{product_name}\n\nВаш отзыв поможет другим покупателям сделать правильный выбор.\n\nСпасибо!\n{shop_name}',
    variables: ['customer_name', 'product_name', 'shop_name']
  },
  {
    id: 4,
    name: 'Брошенная корзина',
    subject: 'Вы забыли товары в корзине',
    content: 'Здравствуйте, {customer_name}!\n\nВы добавили товары в корзину, но не завершили заказ:\n{cart_items}\n\nОбщая сумма: {cart_total} ₸\n\nЗавершите заказ прямо сейчас!\n\n{shop_name}',
    variables: ['customer_name', 'cart_items', 'cart_total', 'shop_name']
  },
];

export default function AutoMailingPage() {
  const { user, store, loading: userLoading } = useUser();

  const [mailings, setMailings] = useState<Mailing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedMailing, setSelectedMailing] = useState<Mailing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mailing | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    triggerType: 'order_created',
    subject: '',
    template: '',
    status: 'draft' as MailingStatus,
  });

  const [settings, setSettings] = useState<MailingSettings>({
    senderName: '',
    senderEmail: '',
    replyTo: '',
    sendTime: '09:00',
    maxPerDay: 100,
    enabled: true,
  });

  // WhatsApp state
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestSending, setWaTestSending] = useState(false);

  const fetchMailings = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/auto-mailing?userId=${user.id}`);
      const json = await res.json();
      if (json.success) {
        setMailings(json.data.templates || []);
        if (json.data.settings && Object.keys(json.data.settings).length > 0) {
          setSettings(prev => ({ ...prev, ...json.data.settings }));
        } else if (store?.name) {
          setSettings(prev => ({ ...prev, senderName: prev.senderName || store.name }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch mailings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, store?.name]);

  useEffect(() => {
    if (!userLoading && user?.id) {
      fetchMailings();
    }
  }, [userLoading, user?.id, fetchMailings]);

  // WhatsApp: проверка статуса при открытии настроек
  const checkWaStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/whatsapp?userId=${user.id}`);
      const json = await res.json();
      if (json.success) {
        setWaStatus(json.status || 'disconnected');
        if (json.qr) setWaQr(json.qr);
      }
    } catch {
      setWaStatus('disconnected');
    }
  }, [user?.id]);

  const handleWaConnect = async () => {
    if (!user?.id) return;
    setWaLoading(true);
    setWaQr(null);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json();
      if (json.success) {
        setWaStatus(json.status);
        if (json.qr) setWaQr(json.qr);
      }
    } catch (err) {
      console.error('WA connect error:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleWaDisconnect = async () => {
    if (!user?.id) return;
    setWaLoading(true);
    try {
      await fetch(`/api/whatsapp?userId=${user.id}`, { method: 'DELETE' });
      setWaStatus('disconnected');
      setWaQr(null);
    } catch (err) {
      console.error('WA disconnect error:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleWaTestMessage = async () => {
    if (!user?.id || !waTestPhone.trim()) return;
    setWaTestSending(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          testPhone: waTestPhone,
          testMessage: `Тестовое сообщение от ${store?.name || 'Metricon'}. Авторассылка работает!`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setWaTestPhone('');
      }
    } catch (err) {
      console.error('WA test error:', err);
    } finally {
      setWaTestSending(false);
    }
  };

  // Polling QR при ожидании скана
  useEffect(() => {
    if (activeModal !== 'settings' || waStatus !== 'qr_pending') return;
    const interval = setInterval(async () => {
      await checkWaStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeModal, waStatus, checkWaStatus]);

  // Проверяем статус WhatsApp при открытии настроек
  useEffect(() => {
    if (activeModal === 'settings') {
      checkWaStatus();
    }
  }, [activeModal, checkWaStatus]);

  // Статистика
  const stats = {
    totalSent: mailings.reduce((sum, m) => sum + (m.sent_count || 0), 0),
    totalDelivered: mailings.reduce((sum, m) => sum + (m.delivered_count || 0), 0),
    totalOpened: mailings.reduce((sum, m) => sum + (m.opened_count || 0), 0),
    activeMailings: mailings.filter(m => m.status === 'active').length,
  };

  const deliveryRate = stats.totalSent > 0
    ? Math.round((stats.totalDelivered / stats.totalSent) * 100)
    : 0;

  const openRate = stats.totalDelivered > 0
    ? Math.round((stats.totalOpened / stats.totalDelivered) * 100)
    : 0;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'paused': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'paused': return 'Приостановлена';
      default: return 'Черновик';
    }
  };

  const toggleStatus = async (mailing: Mailing) => {
    const newStatus = mailing.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch('/api/auto-mailing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, id: mailing.id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setMailings(prev => prev.map(m => m.id === mailing.id ? { ...m, status: newStatus } : m));
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', triggerType: 'order_created', subject: '', template: '', status: 'draft' });
    setSelectedMailing(null);
    setActiveModal('create');
  };

  const openEditModal = (mailing: Mailing) => {
    setFormData({
      name: mailing.name,
      triggerType: mailing.trigger_type,
      subject: mailing.subject || '',
      template: mailing.template_ru || '',
      status: (mailing.status as MailingStatus) || 'draft',
    });
    setSelectedMailing(mailing);
    setActiveModal('edit');
  };

  const openDeleteModal = (mailing: Mailing) => {
    setDeleteTarget(mailing);
    setActiveModal('delete');
  };

  const openPreviewModal = (mailing: Mailing) => {
    setSelectedMailing(mailing);
    setActiveModal('preview');
  };

  const handleSaveMailing = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      if (selectedMailing) {
        // Редактирование
        const res = await fetch('/api/auto-mailing', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            id: selectedMailing.id,
            name: formData.name,
            triggerType: formData.triggerType,
            subject: formData.subject,
            template: formData.template,
            status: formData.status,
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setMailings(prev => prev.map(m => m.id === selectedMailing.id ? json.data : m));
        }
      } else {
        // Создание
        const res = await fetch('/api/auto-mailing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            name: formData.name,
            triggerType: formData.triggerType,
            subject: formData.subject,
            template: formData.template,
            status: formData.status,
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setMailings(prev => [json.data, ...prev]);
        }
      }
      setActiveModal(null);
    } catch (err) {
      console.error('Failed to save mailing:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMailing = async () => {
    if (!deleteTarget || !user?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/auto-mailing?userId=${user.id}&id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setMailings(prev => prev.filter(m => m.id !== deleteTarget.id));
      }
    } catch (err) {
      console.error('Failed to delete mailing:', err);
    } finally {
      setSaving(false);
      setDeleteTarget(null);
      setActiveModal(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/auto-mailing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, settings }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveModal(null);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: Template) => {
    setFormData({
      ...formData,
      name: template.name,
      subject: template.subject,
      template: template.content,
    });
    setActiveModal(selectedMailing ? 'edit' : 'create');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const statsCards = [
    {
      label: 'Всего отправлено',
      value: stats.totalSent.toLocaleString(),
      icon: Send,
      color: 'bg-blue-50 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Доставлено',
      value: `${deliveryRate}%`,
      subValue: stats.totalDelivered.toLocaleString(),
      icon: CheckCircle2,
      color: 'bg-emerald-50 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Открыто',
      value: `${openRate}%`,
      subValue: stats.totalOpened.toLocaleString(),
      icon: Mail,
      color: 'bg-purple-50 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Активных рассылок',
      value: stats.activeMailings.toString(),
      icon: TrendingUp,
      color: 'bg-orange-50 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  if (userLoading || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl mb-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 dark:text-white">Авторассылка</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Автоматические уведомления клиентам</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${card.color} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              {card.subValue && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.subValue} сообщений</p>
              )}
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Создать рассылку
        </button>
        <button
          onClick={() => setActiveModal('templates')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          Шаблоны сообщений
        </button>
        <button
          onClick={() => setActiveModal('settings')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          Настройки
        </button>
      </div>

      {/* Mailings List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Рассылки</h2>
        </div>

        {mailings.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Нет рассылок</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Создайте первую автоматическую рассылку</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Создать рассылку
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {mailings.map((mailing) => (
              <div
                key={mailing.id}
                className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{mailing.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(mailing.status)}`}>
                        {getStatusText(mailing.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      {triggerLabels[mailing.trigger_type] || mailing.trigger_type}
                    </p>
                    {mailing.subject && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 truncate">Тема: {mailing.subject}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 dark:text-white">{(mailing.sent_count || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Отправлено</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-emerald-600">{(mailing.delivered_count || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Доставлено</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-purple-600">{(mailing.opened_count || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Открыто</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPreviewModal(mailing)}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                      title="Предпросмотр"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {mailing.status !== 'draft' && (
                      <button
                        onClick={() => toggleStatus(mailing)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          mailing.status === 'active'
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                        }`}
                        title={mailing.status === 'active' ? 'Приостановить' : 'Запустить'}
                      >
                        {mailing.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(mailing)}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                      title="Редактировать"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(mailing)}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {mailing.last_sent_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                    Последняя отправка: {formatDate(mailing.last_sent_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Как работает авторассылка?</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Авторассылка отправляет сообщения клиентам автоматически при наступлении определённых событий:
              создание заказа, отправка, доставка и т.д. Настройте триггеры и шаблоны сообщений,
              чтобы держать клиентов в курсе статуса их заказов.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Create/Edit Mailing */}
      <AnimatePresence>
        {(activeModal === 'create' || activeModal === 'edit') && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold dark:text-white">
                  {activeModal === 'create' ? 'Создать рассылку' : 'Редактировать рассылку'}
                </h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название рассылки
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Например: Подтверждение заказа"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Когда отправлять
                  </label>
                  <div className="relative">
                    <select
                      value={formData.triggerType}
                      onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
                    >
                      {triggerOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тема сообщения
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Например: Ваш заказ #{order_id} принят"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Текст сообщения
                    </label>
                    <button
                      onClick={() => setActiveModal('templates')}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                    >
                      Выбрать из шаблонов
                    </button>
                  </div>
                  <textarea
                    value={formData.template}
                    onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                    placeholder="Введите текст сообщения..."
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Доступные переменные: {'{customer_name}'}, {'{order_id}'}, {'{order_total}'}, {'{tracking_number}'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Статус
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, status: 'draft' })}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        formData.status === 'draft'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Черновик
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, status: 'active' })}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        formData.status === 'active'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Активна
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveMailing}
                    disabled={!formData.name || !formData.subject || !formData.template || saving}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {activeModal === 'create' ? 'Создать' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Templates */}
      <AnimatePresence>
        {activeModal === 'templates' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold dark:text-white">Шаблоны сообщений</h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {defaultTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Тема: {template.subject}</p>
                      </div>
                      <button
                        onClick={() => applyTemplate(template)}
                        className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        Использовать
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 whitespace-pre-line">
                      {template.content}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {template.variables.map(v => (
                        <span key={v} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                          {'{' + v + '}'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Settings */}
      <AnimatePresence>
        {activeModal === 'settings' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold dark:text-white">Настройки рассылки</h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Авторассылка включена</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Автоматическая отправка сообщений</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                      settings.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Имя отправителя
                  </label>
                  <input
                    type="text"
                    value={settings.senderName || ''}
                    onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email отправителя
                  </label>
                  <input
                    type="email"
                    value={settings.senderEmail || ''}
                    onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email для ответов (Reply-To)
                  </label>
                  <input
                    type="email"
                    value={settings.replyTo || ''}
                    onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Максимум сообщений в день
                  </label>
                  <input
                    type="number"
                    value={settings.maxPerDay || 0}
                    onChange={(e) => setSettings({ ...settings, maxPerDay: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* WhatsApp подключение */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">WhatsApp</h3>
                  </div>

                  {waStatus === 'connected' ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                        <Wifi className="w-5 h-5 text-emerald-600" />
                        <div className="flex-1">
                          <p className="font-medium text-emerald-700 dark:text-emerald-400">WhatsApp подключен</p>
                          <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">Сообщения отправляются автоматически</p>
                        </div>
                        <button
                          onClick={handleWaDisconnect}
                          disabled={waLoading}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          {waLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Отключить'}
                        </button>
                      </div>

                      {/* Тестовое сообщение */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Тестовое сообщение
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={waTestPhone}
                            onChange={(e) => setWaTestPhone(e.target.value)}
                            placeholder="+7 777 123 4567"
                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                          <button
                            onClick={handleWaTestMessage}
                            disabled={waTestSending || !waTestPhone.trim()}
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer flex items-center gap-2"
                          >
                            {waTestSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : waStatus === 'qr_pending' && waQr ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                        <QrCode className="w-5 h-5 text-yellow-600" />
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Отсканируйте QR-код в WhatsApp на телефоне
                        </p>
                      </div>
                      <div className="flex justify-center p-4 bg-white dark:bg-gray-900 rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={waQr}
                          alt="WhatsApp QR"
                          className="w-64 h-64"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        WhatsApp → Настройки → Связанные устройства → Привязка устройства
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                        <WifiOff className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-700 dark:text-gray-300">WhatsApp не подключен</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Подключите для автоматической отправки</p>
                        </div>
                      </div>
                      <button
                        onClick={handleWaConnect}
                        disabled={waLoading}
                        className="w-full px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        {waLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                        Подключить WhatsApp
                      </button>

                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                          <strong>Как не получить блокировку:</strong> не отправляйте более 50 сообщений в день,
                          используйте персонализированные шаблоны, не рассылайте спам.
                          Рекомендуем использовать отдельный номер для бизнеса.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Сохранить
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Delete Confirmation */}
      <AnimatePresence>
        {activeModal === 'delete' && deleteTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-center mb-2 dark:text-white">Удалить рассылку?</h2>
                <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
                  Вы уверены, что хотите удалить рассылку &quot;{deleteTarget.name}&quot;?
                  Это действие нельзя отменить.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDeleteTarget(null);
                      setActiveModal(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDeleteMailing}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Удалить
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Preview */}
      <AnimatePresence>
        {activeModal === 'preview' && selectedMailing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold dark:text-white">Предпросмотр</h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">{(settings.senderName || 'M')[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{settings.senderName || store?.name || 'Магазин'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{settings.senderEmail || ''}</p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {(selectedMailing.subject || '').replace('{order_id}', '12345')}
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {(selectedMailing.template_ru || '')
                        .replace('{customer_name}', 'Алексей')
                        .replace('{order_id}', '12345')
                        .replace('{order_total}', '150 000')
                        .replace('{shop_name}', settings.senderName || store?.name || 'Магазин')
                      }
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                  Так будет выглядеть сообщение для клиента
                </p>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full mt-4 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
