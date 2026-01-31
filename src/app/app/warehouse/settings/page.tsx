'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  MapPin,
  Building2,
  Link as LinkIcon,
  Unlink
} from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  city: string;
  address?: string;
  isKaspiLinked: boolean;
  kaspiWarehouseId?: string;
  kaspiWarehouseName?: string;
  productCount: number;
  createdAt: string;
}

interface KaspiWarehouse {
  id: string;
  name: string;
  city: string;
  isLinked: boolean;
  linkedToId?: string;
}

export default function WarehouseSettingsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([
    {
      id: 'wh-1',
      name: 'Основной склад',
      city: 'Алматы',
      address: 'ул. Абая 150',
      isKaspiLinked: true,
      kaspiWarehouseId: 'kaspi-almaty-1',
      kaspiWarehouseName: 'Kaspi Алматы Центр',
      productCount: 156,
      createdAt: '2024-01-15'
    },
    {
      id: 'wh-2',
      name: 'Склад Астана',
      city: 'Астана',
      address: 'пр. Мангилик Ел 45',
      isKaspiLinked: true,
      kaspiWarehouseId: 'kaspi-astana-1',
      kaspiWarehouseName: 'Kaspi Астана',
      productCount: 89,
      createdAt: '2024-03-20'
    },
    {
      id: 'wh-3',
      name: 'Склад Караганда',
      city: 'Караганда',
      isKaspiLinked: false,
      productCount: 45,
      createdAt: '2024-06-10'
    },
    {
      id: 'wh-4',
      name: 'Склад Шымкент',
      city: 'Шымкент',
      isKaspiLinked: false,
      productCount: 32,
      createdAt: '2024-08-05'
    }
  ]);

  const [kaspiWarehouses] = useState<KaspiWarehouse[]>([
    { id: 'kaspi-almaty-1', name: 'Kaspi Алматы Центр', city: 'Алматы', isLinked: true, linkedToId: 'wh-1' },
    { id: 'kaspi-almaty-2', name: 'Kaspi Алматы Юг', city: 'Алматы', isLinked: false },
    { id: 'kaspi-astana-1', name: 'Kaspi Астана', city: 'Астана', isLinked: true, linkedToId: 'wh-2' },
    { id: 'kaspi-karaganda-1', name: 'Kaspi Караганда', city: 'Караганда', isLinked: false },
    { id: 'kaspi-shymkent-1', name: 'Kaspi Шымкент', city: 'Шымкент', isLinked: false },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('14.01.2025 15:30');

  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    city: '',
    address: ''
  });

  const handleAddWarehouse = () => {
    if (!newWarehouse.name || !newWarehouse.city) return;

    const warehouse: Warehouse = {
      id: `wh-${Date.now()}`,
      name: newWarehouse.name,
      city: newWarehouse.city,
      address: newWarehouse.address || undefined,
      isKaspiLinked: false,
      productCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setWarehouses([...warehouses, warehouse]);
    setNewWarehouse({ name: '', city: '', address: '' });
    setShowAddModal(false);
  };

  const handleDeleteWarehouse = (id: string) => {
    if (confirm('Удалить этот склад? Все товары будут откреплены.')) {
      setWarehouses(warehouses.filter(w => w.id !== id));
    }
  };

  const handleLinkKaspi = (kaspiWarehouse: KaspiWarehouse) => {
    if (!selectedWarehouse) return;

    setWarehouses(warehouses.map(w => {
      if (w.id === selectedWarehouse.id) {
        return {
          ...w,
          isKaspiLinked: true,
          kaspiWarehouseId: kaspiWarehouse.id,
          kaspiWarehouseName: kaspiWarehouse.name
        };
      }
      return w;
    }));

    setShowLinkModal(false);
    setSelectedWarehouse(null);
  };

  const handleUnlinkKaspi = (warehouseId: string) => {
    setWarehouses(warehouses.map(w => {
      if (w.id === warehouseId) {
        return {
          ...w,
          isKaspiLinked: false,
          kaspiWarehouseId: undefined,
          kaspiWarehouseName: undefined
        };
      }
      return w;
    }));
  };

  const handleSyncKaspi = async () => {
    setIsSyncing(true);
    // Имитация синхронизации
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLastSyncTime(new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
    setIsSyncing(false);
  };

  const availableKaspiWarehouses = kaspiWarehouses.filter(kw => !kw.isLinked);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <Link
          href="/app/warehouse"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Назад к складу</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Настройки складов</h1>
        <p className="text-gray-500 text-sm">Управление складами и интеграция с Kaspi</p>
      </div>

      {/* Kaspi Integration Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">K</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Интеграция с Kaspi</h2>
              <p className="text-sm text-gray-500">Синхронизация складов и остатков</p>
            </div>
          </div>
          <button
            onClick={handleSyncKaspi}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
          </button>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Подключено складов: {warehouses.filter(w => w.isKaspiLinked).length}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Не подключено: {warehouses.filter(w => !w.isKaspiLinked).length}</span>
          </div>
          <div className="text-gray-400">
            Последняя синхронизация: {lastSyncTime}
          </div>
        </div>
      </div>

      {/* Warehouses List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Мои склады</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить склад
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {warehouses.map((warehouse) => (
            <motion.div
              key={warehouse.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{warehouse.city}{warehouse.address && ` • ${warehouse.address}`}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                        {warehouse.productCount} товаров
                      </span>

                      {warehouse.isKaspiLinked ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                          <LinkIcon className="w-3 h-3" />
                          {warehouse.kaspiWarehouseName}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Не привязан
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {warehouse.isKaspiLinked ? (
                    <button
                      onClick={() => handleUnlinkKaspi(warehouse.id)}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Отвязать от Kaspi"
                    >
                      <Unlink className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedWarehouse(warehouse);
                        setShowLinkModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Привязать к Kaspi"
                    >
                      <LinkIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteWarehouse(warehouse.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить склад"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-semibold mb-4">Добавить склад</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название склада *
                </label>
                <input
                  type="text"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  placeholder="Например: Основной склад"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Город *
                </label>
                <select
                  value={newWarehouse.city}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, city: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300"
                >
                  <option value="">Выберите город</option>
                  <option value="Алматы">Алматы</option>
                  <option value="Астана">Астана</option>
                  <option value="Караганда">Караганда</option>
                  <option value="Шымкент">Шымкент</option>
                  <option value="Актобе">Актобе</option>
                  <option value="Павлодар">Павлодар</option>
                  <option value="Усть-Каменогорск">Усть-Каменогорск</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Адрес
                </label>
                <input
                  type="text"
                  value={newWarehouse.address}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                  placeholder="ул. Пример 123"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-300"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewWarehouse({ name: '', city: '', address: '' });
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddWarehouse}
                disabled={!newWarehouse.name || !newWarehouse.city}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Добавить
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Link to Kaspi Modal */}
      {showLinkModal && selectedWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-semibold mb-2">Привязать к Kaspi</h3>
            <p className="text-sm text-gray-500 mb-4">
              Выберите склад Kaspi для привязки к &quot;{selectedWarehouse.name}&quot;
            </p>

            {availableKaspiWarehouses.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableKaspiWarehouses.map((kw) => (
                  <button
                    key={kw.id}
                    onClick={() => handleLinkKaspi(kw)}
                    className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600 font-bold text-xs">K</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{kw.name}</p>
                      <p className="text-xs text-gray-500">{kw.city}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Все склады Kaspi уже привязаны</p>
              </div>
            )}

            <button
              onClick={() => {
                setShowLinkModal(false);
                setSelectedWarehouse(null);
              }}
              className="w-full mt-4 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
