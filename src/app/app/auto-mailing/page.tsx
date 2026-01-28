'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  Edit3,
  Users,
  MessageSquare,
  TrendingUp,
  X,
  ChevronDown,
  Copy,
  Eye,
  AlertTriangle,
  Bell,
  Package,
  Truck,
  Star,
  ShoppingCart
} from 'lucide-react';

type MailingStatus = 'active' | 'paused' | 'draft';
type ModalType = 'create' | 'edit' | 'templates' | 'settings' | 'delete' | 'preview' | null;

interface Mailing {
  id: number;
  name: string;
  trigger: string;
  triggerType: string;
  template: string;
  subject: string;
  status: MailingStatus;
  sent: number;
  delivered: number;
  opened: number;
  lastSent?: string;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

const triggerOptions = [
  { value: 'order_created', label: 'При создании заказа', icon: ShoppingCart },
  { value: 'order_shipped', label: 'При отправке заказа', icon: Truck },
  { value: 'order_delivered', label: 'При доставке заказа', icon: Package },
  { value: 'review_request', label: 'Запрос отзыва (через 7 дней)', icon: Star },
  { value: 'cart_abandoned', label: 'Брошенная корзина (через 24ч)', icon: ShoppingCart },
  { value: 'custom', label: 'Пользовательский триггер', icon: Bell },
];

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
  const [mailings, setMailings] = useState<Mailing[]>([
    {
      id: 1,
      name: 'Подтверждение заказа',
      trigger: 'При создании заказа',
      triggerType: 'order_created',
      subject: 'Ваш заказ #{order_id} принят',
      template: 'Здравствуйте, {customer_name}!\n\nВаш заказ #{order_id} успешно создан...',
      status: 'active',
      sent: 1245,
      delivered: 1230,
      opened: 890,
      lastSent: '14.01.2025, 15:30'
    },
    {
      id: 2,
      name: 'Заказ отправлен',
      trigger: 'При отправке заказа',
      triggerType: 'order_shipped',
      subject: 'Ваш заказ #{order_id} отправлен',
      template: 'Здравствуйте, {customer_name}!\n\nВаш заказ #{order_id} отправлен...',
      status: 'active',
      sent: 987,
      delivered: 980,
      opened: 756,
      lastSent: '14.01.2025, 14:15'
    },
    {
      id: 3,
      name: 'Запрос отзыва',
      trigger: 'Через 7 дней после доставки',
      triggerType: 'review_request',
      subject: 'Оставьте отзыв о покупке',
      template: 'Здравствуйте, {customer_name}!\n\nНадеемся, вам понравилась покупка...',
      status: 'paused',
      sent: 523,
      delivered: 515,
      opened: 234,
      lastSent: '10.01.2025, 10:00'
    },
    {
      id: 4,
      name: 'Напоминание о брошенной корзине',
      trigger: 'Через 24 часа после добавления в корзину',
      triggerType: 'cart_abandoned',
      subject: 'Вы забыли товары в корзине',
      template: 'Здравствуйте, {customer_name}!\n\nВы добавили товары в корзину...',
      status: 'draft',
      sent: 0,
      delivered: 0,
      opened: 0
    }
  ]);

  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedMailing, setSelectedMailing] = useState<Mailing | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mailing | null>(null);

  // Форма для создания/редактирования
  const [formData, setFormData] = useState({
    name: '',
    triggerType: 'order_created',
    subject: '',
    template: '',
    status: 'draft' as MailingStatus
  });

  // Настройки
  const [settings, setSettings] = useState({
    senderName: 'Luxstone',
    senderEmail: 'orders@luxstone.kz',
    replyTo: 'support@luxstone.kz',
    sendTime: '09:00',
    maxPerDay: 100,
    enabled: true
  });

  // Статистика
  const stats = {
    totalSent: mailings.reduce((sum, m) => sum + m.sent, 0),
    totalDelivered: mailings.reduce((sum, m) => sum + m.delivered, 0),
    totalOpened: mailings.reduce((sum, m) => sum + m.opened, 0),
    activeMailings: mailings.filter(m => m.status === 'active').length
  };

  const deliveryRate = stats.totalSent > 0
    ? Math.round((stats.totalDelivered / stats.totalSent) * 100)
    : 0;

  const openRate = stats.totalDelivered > 0
    ? Math.round((stats.totalOpened / stats.totalDelivered) * 100)
    : 0;

  const getStatusColor = (status: MailingStatus) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: MailingStatus) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'paused': return 'Приостановлена';
      case 'draft': return 'Черновик';
    }
  };

  const toggleStatus = (id: number) => {
    setMailings(mailings.map(m => {
      if (m.id === id) {
        const newStatus = m.status === 'active' ? 'paused' : 'active';
        return { ...m, status: newStatus };
      }
      return m;
    }));
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      triggerType: 'order_created',
      subject: '',
      template: '',
      status: 'draft'
    });
    setSelectedMailing(null);
    setActiveModal('create');
  };

  const openEditModal = (mailing: Mailing) => {
    setFormData({
      name: mailing.name,
      triggerType: mailing.triggerType,
      subject: mailing.subject,
      template: mailing.template,
      status: mailing.status
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

  const handleSaveMailing = () => {
    const trigger = triggerOptions.find(t => t.value === formData.triggerType);

    if (selectedMailing) {
      // Редактирование
      setMailings(mailings.map(m => {
        if (m.id === selectedMailing.id) {
          return {
            ...m,
            name: formData.name,
            triggerType: formData.triggerType,
            trigger: trigger?.label || '',
            subject: formData.subject,
            template: formData.template,
            status: formData.status
          };
        }
        return m;
      }));
    } else {
      // Создание
      const newMailing: Mailing = {
        id: Math.max(...mailings.map(m => m.id)) + 1,
        name: formData.name,
        triggerType: formData.triggerType,
        trigger: trigger?.label || '',
        subject: formData.subject,
        template: formData.template,
        status: formData.status,
        sent: 0,
        delivered: 0,
        opened: 0
      };
      setMailings([...mailings, newMailing]);
    }
    setActiveModal(null);
  };

  const handleDeleteMailing = () => {
    if (deleteTarget) {
      setMailings(mailings.filter(m => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      setActiveModal(null);
    }
  };

  const applyTemplate = (template: Template) => {
    setFormData({
      ...formData,
      name: template.name,
      subject: template.subject,
      template: template.content
    });
    setActiveModal(selectedMailing ? 'edit' : 'create');
  };

  const statsCards = [
    {
      label: 'Всего отправлено',
      value: stats.totalSent.toLocaleString(),
      icon: Send,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Доставлено',
      value: `${deliveryRate}%`,
      subValue: stats.totalDelivered.toLocaleString(),
      icon: CheckCircle2,
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      label: 'Открыто',
      value: `${openRate}%`,
      subValue: stats.totalOpened.toLocaleString(),
      icon: Mail,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      label: 'Активных рассылок',
      value: stats.activeMailings.toString(),
      icon: TrendingUp,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Авторассылка</h1>
        <p className="text-gray-500 text-sm">Автоматические уведомления клиентам</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`${card.color} rounded-xl p-4`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.subValue && (
                <p className="text-xs text-gray-500 mt-1">{card.subValue} сообщений</p>
              )}
              <p className="text-xs text-gray-600 mt-1">{card.label}</p>
            </motion.div>
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
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          Шаблоны сообщений
        </button>
        <button
          onClick={() => setActiveModal('settings')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          Настройки
        </button>
      </div>

      {/* Mailings List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Рассылки</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {mailings.map((mailing, index) => (
            <motion.div
              key={mailing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{mailing.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(mailing.status)}`}>
                      {getStatusText(mailing.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    {mailing.trigger}
                  </p>
                  <p className="text-sm text-gray-400 truncate">Тема: {mailing.subject}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{mailing.sent.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Отправлено</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-emerald-600">{mailing.delivered.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Доставлено</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-purple-600">{mailing.opened.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Открыто</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPreviewModal(mailing)}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                    title="Предпросмотр"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {mailing.status !== 'draft' && (
                    <button
                      onClick={() => toggleStatus(mailing.id)}
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
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                    title="Редактировать"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(mailing)}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors cursor-pointer"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {mailing.lastSent && (
                <p className="text-xs text-gray-400 mt-3">
                  Последняя отправка: {mailing.lastSent}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mt-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white"
      >
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
      </motion.div>

      {/* Modal: Create/Edit Mailing */}
      <AnimatePresence>
        {(activeModal === 'create' || activeModal === 'edit') && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold">
                  {activeModal === 'create' ? 'Создать рассылку' : 'Редактировать рассылку'}
                </h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Название */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название рассылки
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Например: Подтверждение заказа"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Триггер */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Когда отправлять
                  </label>
                  <div className="relative">
                    <select
                      value={formData.triggerType}
                      onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
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

                {/* Тема письма */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тема сообщения
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Например: Ваш заказ #{order_id} принят"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Шаблон сообщения */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Доступные переменные: {'{customer_name}'}, {'{order_id}'}, {'{order_total}'}, {'{tracking_number}'}
                  </p>
                </div>

                {/* Статус */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Статус
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, status: 'draft' })}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        formData.status === 'draft'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Черновик
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, status: 'active' })}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        formData.status === 'active'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Активна
                    </button>
                  </div>
                </div>

                {/* Кнопки */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveMailing}
                    disabled={!formData.name || !formData.subject || !formData.template}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
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
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold">Шаблоны сообщений</h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">Тема: {template.subject}</p>
                      </div>
                      <button
                        onClick={() => applyTemplate(template)}
                        className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        Использовать
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line">
                      {template.content}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {template.variables.map(v => (
                        <span key={v} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
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
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold">Настройки рассылки</h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Включить/выключить */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">Авторассылка включена</p>
                    <p className="text-sm text-gray-500">Автоматическая отправка сообщений</p>
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

                {/* Имя отправителя */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя отправителя
                  </label>
                  <input
                    type="text"
                    value={settings.senderName}
                    onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Email отправителя */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email отправителя
                  </label>
                  <input
                    type="email"
                    value={settings.senderEmail}
                    onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Reply-To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email для ответов (Reply-To)
                  </label>
                  <input
                    type="email"
                    value={settings.replyTo}
                    onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Лимит в день */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Максимум сообщений в день
                  </label>
                  <input
                    type="number"
                    value={settings.maxPerDay}
                    onChange={(e) => setSettings({ ...settings, maxPerDay: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Кнопки */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
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
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-center mb-2">Удалить рассылку?</h2>
                <p className="text-gray-500 text-center text-sm mb-6">
                  Вы уверены, что хотите удалить рассылку "{deleteTarget.name}"?
                  Это действие нельзя отменить.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDeleteTarget(null);
                      setActiveModal(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDeleteMailing}
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
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
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold">Предпросмотр</h2>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                {/* Email Preview */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">L</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{settings.senderName}</p>
                        <p className="text-xs text-gray-500">{settings.senderEmail}</p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">{selectedMailing.subject.replace('{order_id}', '12345')}</p>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {selectedMailing.template
                        .replace('{customer_name}', 'Алексей')
                        .replace('{order_id}', '12345')
                        .replace('{order_total}', '150 000')
                        .replace('{shop_name}', settings.senderName)
                      }
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Так будет выглядеть сообщение для клиента
                </p>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full mt-4 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
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
