'use client';

import { useState } from 'react';
import { Search, Filter, ChevronDown, Package, Truck, FileText, Calendar, ArrowLeft, Eye, CheckCircle, XCircle, X, Scale, Link2 } from 'lucide-react';
import LinkProductModal from '@/components/warehouse/LinkProductModal';

// Типы статусов заказа
type OrderStatus = 'in_transit' | 'completed' | 'cancelled';

// Тип товара в заказе
type ItemType = 'existing' | 'draft';

interface OrderItem {
  id: string;
  type: ItemType;              // existing = из Kaspi, draft = черновик
  name: string;
  sku?: string;                // SKU (только для existing или после привязки)
  quantity: number;
  pricePerUnit: number;
  total: number;

  // Для existing товаров
  productId?: number;          // ID товара из /app/products

  // Для draft товаров
  draftDescription?: string;   // Описание черновика
  linkedProductId?: number;    // ID товара Kaspi после привязки
  linkedSku?: string;          // SKU после привязки

  // Заполняются при приёмке
  weight?: number;             // Вес в кг
  deliveryCost?: number;       // Стоимость доставки за этот товар
}

interface RestockOrder {
  id: string;
  orderDate: string;           // Дата создания заказа
  expectedDate: string;        // Ожидаемая дата прибытия
  supplier: string;
  status: OrderStatus;
  items: OrderItem[];
  totalItems: number;
  totalAmount: number;
  deliveryCost: number;
  invoice?: string;
  notes?: string;
}

// Legacy alias для обратной совместимости
type ReceiptStatus = OrderStatus;
type Receipt = RestockOrder;

// Mock данные заказов на пополнение
const initialReceipts: RestockOrder[] = [
  {
    id: 'ORD-2025-001',
    orderDate: '2025-10-15',
    expectedDate: '2025-11-02',
    supplier: 'Apple Inc.',
    status: 'completed',
    items: [
      { id: 'item-001', type: 'existing', name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', productId: 1, quantity: 50, pricePerUnit: 350000, total: 17500000, weight: 12, deliveryCost: 125000 },
    ],
    totalItems: 50,
    totalAmount: 17625000,
    deliveryCost: 125000,
    invoice: 'INV-2025-001.pdf',
  },
  {
    id: 'ORD-2025-002',
    orderDate: '2025-10-20',
    expectedDate: '2025-11-05',
    supplier: 'Samsung Electronics',
    status: 'completed',
    items: [
      { id: 'item-002', type: 'existing', name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', productId: 2, quantity: 20, pricePerUnit: 295000, total: 5900000, weight: 4.6, deliveryCost: 46000 },
    ],
    totalItems: 20,
    totalAmount: 5946000,
    deliveryCost: 46000,
    invoice: 'INV-2025-002.pdf',
  },
  {
    id: 'ORD-2025-003',
    orderDate: '2025-10-25',
    expectedDate: '2025-11-08',
    supplier: 'Apple Inc.',
    status: 'in_transit',
    items: [
      { id: 'item-003', type: 'existing', name: 'AirPods Pro 2', sku: 'APL-APP2', productId: 3, quantity: 30, pricePerUnit: 58000, total: 1740000 },
      { id: 'item-004', type: 'existing', name: 'AirPods Max', sku: 'APL-APM', productId: 13, quantity: 10, pricePerUnit: 180000, total: 1800000 },
    ],
    totalItems: 40,
    totalAmount: 3540000,
    deliveryCost: 0,
    invoice: 'INV-2025-003.pdf',
  },
  {
    id: 'ORD-2025-004',
    orderDate: '2025-10-10',
    expectedDate: '2025-10-28',
    supplier: 'Apple Inc.',
    status: 'in_transit',
    items: [
      { id: 'item-005', type: 'existing', name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', productId: 4, quantity: 10, pricePerUnit: 680000, total: 6800000 },
      { id: 'item-006', type: 'existing', name: 'MacBook Air M2', sku: 'APL-MBA-M2', productId: 14, quantity: 15, pricePerUnit: 420000, total: 6300000 },
      { id: 'item-007', type: 'draft', name: 'Mac Mini M2 Pro', draftDescription: 'Новая модель Mac Mini с чипом M2 Pro', quantity: 8, pricePerUnit: 380000, total: 3040000 },
    ],
    totalItems: 33,
    totalAmount: 16140000,
    deliveryCost: 0,
    invoice: 'INV-2025-004.pdf',
    notes: 'Партия включает новый товар Mac Mini M2 Pro - требуется создать карточку в Kaspi',
  },
  {
    id: 'ORD-2025-005',
    orderDate: '2025-09-28',
    expectedDate: '2025-10-15',
    supplier: 'Apple Inc.',
    status: 'in_transit',
    items: [
      { id: 'item-008', type: 'existing', name: 'iPad Air 5th Gen', sku: 'APL-IPA5', productId: 5, quantity: 15, pricePerUnit: 210000, total: 3150000 },
      { id: 'item-009', type: 'draft', name: 'iPhone 16 Pro 256GB', draftDescription: 'Новый iPhone 16 Pro, заказ до появления в Kaspi', quantity: 20, pricePerUnit: 520000, total: 10400000 },
    ],
    totalItems: 35,
    totalAmount: 13550000,
    deliveryCost: 0,
    notes: 'iPhone 16 Pro - новинка, карточка будет создана после получения',
  },
  {
    id: 'ORD-2025-006',
    orderDate: '2025-11-01',
    expectedDate: '2025-11-15',
    supplier: 'Apple Inc.',
    status: 'completed',
    items: [
      { id: 'item-010', type: 'existing', name: 'Apple Watch Ultra', sku: 'APL-AWU', productId: 6, quantity: 35, pricePerUnit: 285000, total: 9975000, weight: 2.8, deliveryCost: 42000 },
    ],
    totalItems: 35,
    totalAmount: 10017000,
    deliveryCost: 42000,
    invoice: 'INV-2025-006.pdf',
  },
  {
    id: 'ORD-2025-007',
    orderDate: '2025-10-18',
    expectedDate: '2025-11-01',
    supplier: 'Sony Corporation',
    status: 'completed',
    items: [
      { id: 'item-011', type: 'existing', name: 'Sony WH-1000XM5', sku: 'SNY-WH1000', productId: 7, quantity: 25, pricePerUnit: 95000, total: 2375000, weight: 6.25, deliveryCost: 37500 },
    ],
    totalItems: 25,
    totalAmount: 2412500,
    deliveryCost: 37500,
    invoice: 'INV-2025-007.pdf',
  },
  {
    id: 'ORD-2025-008',
    orderDate: '2025-10-22',
    expectedDate: '2025-11-06',
    supplier: 'Samsung Electronics',
    status: 'completed',
    items: [
      { id: 'item-012', type: 'existing', name: 'Samsung Galaxy Tab S9', sku: 'SAM-GTS9', productId: 8, quantity: 60, pricePerUnit: 235000, total: 14100000, weight: 30, deliveryCost: 168000 },
    ],
    totalItems: 60,
    totalAmount: 14268000,
    deliveryCost: 168000,
    invoice: 'INV-2025-008.pdf',
  },
  {
    id: 'ORD-2025-009',
    orderDate: '2025-10-28',
    expectedDate: '2025-11-12',
    supplier: 'Google LLC',
    status: 'completed',
    items: [
      { id: 'item-013', type: 'existing', name: 'Google Pixel 8 Pro', sku: 'GGL-PX8P', productId: 9, quantity: 15, pricePerUnit: 255000, total: 3825000, weight: 3.15, deliveryCost: 33000 },
    ],
    totalItems: 15,
    totalAmount: 3858000,
    deliveryCost: 33000,
    invoice: 'INV-2025-009.pdf',
  },
  {
    id: 'ORD-2025-010',
    orderDate: '2025-10-12',
    expectedDate: '2025-10-27',
    supplier: 'Nintendo Co., Ltd.',
    status: 'completed',
    items: [
      { id: 'item-014', type: 'existing', name: 'Nintendo Switch OLED', sku: 'NTD-SWOLED', productId: 10, quantity: 30, pricePerUnit: 110000, total: 3300000, weight: 12.6, deliveryCost: 75000 },
    ],
    totalItems: 30,
    totalAmount: 3375000,
    deliveryCost: 75000,
    invoice: 'INV-2025-010.pdf',
  },
  {
    id: 'ORD-2025-011',
    orderDate: '2025-10-05',
    expectedDate: '2025-10-22',
    supplier: 'DJI Technology',
    status: 'completed',
    items: [
      { id: 'item-015', type: 'existing', name: 'DJI Mini 3 Pro', sku: 'DJI-M3P', productId: 11, quantity: 10, pricePerUnit: 275000, total: 2750000, weight: 2.5, deliveryCost: 35000 },
    ],
    totalItems: 10,
    totalAmount: 2785000,
    deliveryCost: 35000,
    invoice: 'INV-2025-011.pdf',
  },
  {
    id: 'ORD-2025-012',
    orderDate: '2025-09-20',
    expectedDate: '2025-10-05',
    supplier: 'Bose Corporation',
    status: 'cancelled',
    items: [
      { id: 'item-016', type: 'existing', name: 'Bose QuietComfort 45', sku: 'BOS-QC45', productId: 12, quantity: 20, pricePerUnit: 82000, total: 1640000 },
    ],
    totalItems: 20,
    totalAmount: 1668000,
    deliveryCost: 0,
    notes: 'Заказ отменён поставщиком',
  },
];

const suppliers = ['Все', 'Apple Inc.', 'Samsung Electronics', 'Sony Corporation', 'Google LLC', 'Nintendo Co., Ltd.', 'DJI Technology', 'Bose Corporation'];

type StatusFilter = 'all' | 'completed' | 'in_transit' | 'cancelled';

interface WeightInput {
  itemId: string;      // ID позиции в заказе
  sku?: string;        // SKU (может отсутствовать у черновиков)
  name: string;
  quantity: number;
  weight: number;
  deliveryCost: number;
}

export default function WarehouseHistoryPage() {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState('Все');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

  // Popup states
  const [showAcceptPopup, setShowAcceptPopup] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [weightInputs, setWeightInputs] = useState<WeightInput[]>([]);
  const [totalDeliveryCost, setTotalDeliveryCost] = useState<number>(0);

  // Link product modal states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedDraftItem, setSelectedDraftItem] = useState<{
    orderId: string;
    item: OrderItem;
  } | null>(null);

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  };

  // Открыть модалку привязки черновика
  const openLinkModal = (orderId: string, item: OrderItem) => {
    setSelectedDraftItem({ orderId, item });
    setShowLinkModal(true);
  };

  // Обработчик привязки товара
  const handleLinkProduct = (draftItemId: string, kaspiProduct: { id: number; name: string; sku: string }) => {
    if (!selectedDraftItem) return;

    setReceipts(prev => prev.map(receipt => {
      if (receipt.id === selectedDraftItem.orderId) {
        return {
          ...receipt,
          items: receipt.items.map(item => {
            if (item.id === draftItemId) {
              return {
                ...item,
                linkedProductId: kaspiProduct.id,
                linkedSku: kaspiProduct.sku,
                sku: kaspiProduct.sku,
              };
            }
            return item;
          })
        };
      }
      return receipt;
    }));

    setShowLinkModal(false);
    setSelectedDraftItem(null);
  };

  // Открыть попап приёмки
  const openAcceptPopup = (receipt: Receipt, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReceipt(receipt);
    setWeightInputs(receipt.items.map(item => ({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      weight: 0,
      deliveryCost: 0
    })));
    setTotalDeliveryCost(0);
    setShowAcceptPopup(true);
  };

  // Обновить вес товара
  const updateWeight = (itemId: string, weight: number) => {
    setWeightInputs(prev => prev.map(item =>
      item.itemId === itemId ? { ...item, weight } : item
    ));
  };

  // Рассчитать доставку по весу
  const calculateDelivery = () => {
    const totalWeight = weightInputs.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0 || totalDeliveryCost === 0) return;

    const costPerKg = totalDeliveryCost / totalWeight;

    setWeightInputs(prev => prev.map(item => ({
      ...item,
      deliveryCost: Math.round(item.weight * costPerKg)
    })));
  };

  // Получить общий вес
  const getTotalWeight = () => {
    return weightInputs.reduce((sum, item) => sum + item.weight, 0);
  };

  // Получить рассчитанную сумму доставки
  const getCalculatedDelivery = () => {
    return weightInputs.reduce((sum, item) => sum + item.deliveryCost, 0);
  };

  // Принять товар
  const acceptReceipt = () => {
    if (!selectedReceipt) return;

    const totalWeight = getTotalWeight();
    if (totalWeight === 0 || totalDeliveryCost === 0) {
      alert('Укажите вес товаров и общую сумму доставки');
      return;
    }

    // Обновить статус приёмки и сохранить данные о весе и доставке по каждому товару
    setReceipts(prev => prev.map(r => {
      if (r.id === selectedReceipt.id) {
        // Обновляем items с данными о весе и стоимости доставки
        const updatedItems = r.items.map(item => {
          const weightData = weightInputs.find(w => w.itemId === item.id);
          return {
            ...item,
            weight: weightData?.weight || 0,
            deliveryCost: weightData?.deliveryCost || 0
          };
        });

        return {
          ...r,
          items: updatedItems,
          status: 'completed' as OrderStatus,
          deliveryCost: totalDeliveryCost,
          totalAmount: r.items.reduce((sum, i) => sum + i.total, 0) + totalDeliveryCost
        };
      }
      return r;
    }));

    setShowAcceptPopup(false);
    setSelectedReceipt(null);
  };

  // Фильтрация приёмок
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = searchQuery === '' ||
      receipt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    const matchesSupplier = supplierFilter === 'Все' || receipt.supplier === supplierFilter;

    return matchesSearch && matchesStatus && matchesSupplier;
  });

  // Подсчёт статистики
  const stats = {
    total: receipts.length,
    completed: receipts.filter(r => r.status === 'completed').length,
    inTransit: receipts.filter(r => r.status === 'in_transit').length,
    cancelled: receipts.filter(r => r.status === 'cancelled').length,
    totalAmount: receipts.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.totalAmount, 0),
  };

  // Статус бейдж
  const StatusBadge = ({ status }: { status: ReceiptStatus }) => {
    const config = {
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, label: 'Получено' },
      in_transit: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Truck, label: 'В пути' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Отменено' },
    };
    const { bg, text, icon: Icon, label } = config[status];

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">История приёмок</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Все поступления товаров на склад</p>
        </div>
        <a
          href="/app/warehouse"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к складу
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div
          className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <span className="text-gray-600 text-xs sm:text-sm">Всего</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">на {(stats.totalAmount / 1000000).toFixed(1)}M ₸</div>
        </div>

        <div
          className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'completed' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <span className="text-gray-600 text-xs sm:text-sm">Получено</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.completed}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">приёмок</div>
        </div>

        <div
          className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'in_transit' ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'in_transit' ? 'all' : 'in_transit')}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <span className="text-gray-600 text-xs sm:text-sm">В пути</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.inTransit}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">приёмок</div>
        </div>

        <div
          className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'cancelled' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg sm:rounded-xl flex items-center justify-center">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <span className="text-gray-600 text-xs sm:text-sm">Отменено</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.cancelled}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">приёмок</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pl-10 sm:pl-11 pr-4"
            />
          </div>

          {/* Supplier Filter */}
          <div className="relative">
            <button
              onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors w-full sm:min-w-[200px] justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 text-sm truncate">{supplierFilter}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${showSupplierDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSupplierDropdown && (
              <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-2 max-h-64 overflow-y-auto">
                {suppliers.map((supplier) => (
                  <button
                    key={supplier}
                    onClick={() => {
                      setSupplierFilter(supplier);
                      setShowSupplierDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors cursor-pointer text-sm ${
                      supplierFilter === supplier ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-700'
                    }`}
                  >
                    {supplier}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipts List */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredReceipts.map((receipt) => (
            <div key={receipt.id} className="hover:bg-gray-50 transition-colors">
              {/* Main Row */}
              <div
                className="p-3 sm:p-4 cursor-pointer"
                onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}
              >
                {/* Mobile Layout */}
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 text-sm">{receipt.id}</span>
                        <div className="mt-0.5">
                          <StatusBadge status={receipt.status} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-gray-900 text-sm">{(receipt.items.reduce((sum, i) => sum + i.total, 0) / 1000000).toFixed(1)}M ₸</div>
                      {receipt.status === 'completed' && (
                        <div className="text-[10px] text-gray-500">+ {(receipt.deliveryCost / 1000).toFixed(0)}K ₸</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(receipt.orderDate)}
                    </span>
                    <span className="truncate">{receipt.supplier}</span>
                    <span>{receipt.totalItems} шт</span>
                  </div>
                  {receipt.items.some(i => i.type === 'draft' && !i.linkedProductId) && (
                    <div className="text-xs text-amber-600 font-medium mb-2">Есть черновики</div>
                  )}
                  {receipt.status === 'in_transit' && (
                    <button
                      onClick={(e) => openAcceptPopup(receipt, e)}
                      className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Принять товар
                    </button>
                  )}
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{receipt.id}</span>
                        <StatusBadge status={receipt.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(receipt.orderDate)}
                        </span>
                        <span>{receipt.supplier}</span>
                        <span>{receipt.totalItems} шт</span>
                        {receipt.items.some(i => i.type === 'draft' && !i.linkedProductId) && (
                          <span className="text-amber-600 font-medium">Есть черновики</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{receipt.items.reduce((sum, i) => sum + i.total, 0).toLocaleString('ru-RU')} ₸</div>
                      {receipt.status === 'completed' && (
                        <div className="text-xs text-gray-500">+ доставка {receipt.deliveryCost.toLocaleString('ru-RU')} ₸</div>
                      )}
                    </div>

                    {/* Кнопка Принять для товаров в пути */}
                    {receipt.status === 'in_transit' && (
                      <button
                        onClick={(e) => openAcceptPopup(receipt, e)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Принять
                      </button>
                    )}

                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                      <Eye className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedReceipt === receipt.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-4 bg-gray-50 rounded-xl p-4">
                    {/* Order Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="text-xs text-gray-500 block">Дата заказа</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(receipt.orderDate)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Ожид. прибытие</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(receipt.expectedDate)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">В пути</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.ceil((new Date(receipt.expectedDate).getTime() - new Date(receipt.orderDate).getTime()) / (1000 * 60 * 60 * 24))} дней
                        </span>
                      </div>
                      {receipt.invoice && (
                        <div>
                          <span className="text-xs text-gray-500 block">Накладная</span>
                          <button className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer">
                            <FileText className="w-4 h-4" />
                            {receipt.invoice}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {receipt.notes && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-xs text-amber-600 font-medium block mb-1">Примечание:</span>
                        <span className="text-sm text-amber-800">{receipt.notes}</span>
                      </div>
                    )}

                    {/* Items Table */}
                    <div className="bg-white rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Кол-во</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Цена/шт</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Сумма</th>
                            {receipt.status === 'completed' && receipt.items.some(i => i.weight) && (
                              <>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Вес</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Доставка</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {receipt.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                                  {item.type === 'draft' && !item.linkedProductId && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                      Черновик
                                    </span>
                                  )}
                                  {item.type === 'draft' && item.linkedProductId && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                                      Привязан
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{item.sku ? item.sku : item.type === 'draft' ? 'Ожидает привязки к Kaspi' : '—'}</span>
                                  {item.type === 'draft' && !item.linkedProductId && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openLinkModal(receipt.id, item);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      <Link2 className="w-3 h-3" />
                                      Привязать
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">{item.quantity} шт</td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600">{item.pricePerUnit.toLocaleString('ru-RU')} ₸</td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{item.total.toLocaleString('ru-RU')} ₸</td>
                              {receipt.status === 'completed' && receipt.items.some(i => i.weight) && (
                                <>
                                  <td className="px-4 py-3 text-right text-sm text-purple-600 font-medium">
                                    {item.weight ? `${item.weight} кг` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-orange-600 font-medium">
                                    {item.deliveryCost ? `${item.deliveryCost.toLocaleString('ru-RU')} ₸` : '-'}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={receipt.status === 'completed' && receipt.items.some(i => i.weight) ? 5 : 3} className="px-4 py-2 text-right text-sm text-gray-500">Товары:</td>
                            <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                              {receipt.items.reduce((sum, i) => sum + i.total, 0).toLocaleString('ru-RU')} ₸
                            </td>
                          </tr>
                          {receipt.status === 'completed' && (
                            <>
                              <tr>
                                <td colSpan={receipt.items.some(i => i.weight) ? 5 : 3} className="px-4 py-2 text-right text-sm text-gray-500">Доставка:</td>
                                <td className="px-4 py-2 text-right text-sm font-medium text-orange-600">
                                  {receipt.deliveryCost.toLocaleString('ru-RU')} ₸
                                </td>
                              </tr>
                              <tr className="border-t border-gray-200">
                                <td colSpan={receipt.items.some(i => i.weight) ? 5 : 3} className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Итого:</td>
                                <td className="px-4 py-2 text-right text-sm font-bold text-emerald-600">
                                  {receipt.totalAmount.toLocaleString('ru-RU')} ₸
                                </td>
                              </tr>
                            </>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredReceipts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Приёмки не найдены</h3>
            <p className="text-gray-500">Попробуйте изменить параметры поиска или фильтры</p>
          </div>
        )}

        {/* Footer */}
        {filteredReceipts.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Показано {filteredReceipts.length} из {receipts.length} приёмок
              </span>
              <div className="text-sm">
                <span className="text-gray-500">Общая сумма: </span>
                <span className="font-bold text-gray-900">
                  {filteredReceipts.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.total, 0), 0).toLocaleString('ru-RU')} ₸
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Link Product Modal */}
      {selectedDraftItem && (
        <LinkProductModal
          isOpen={showLinkModal}
          onClose={() => {
            setShowLinkModal(false);
            setSelectedDraftItem(null);
          }}
          draftItem={{
            id: selectedDraftItem.item.id,
            name: selectedDraftItem.item.name,
            description: selectedDraftItem.item.draftDescription,
            quantity: selectedDraftItem.item.quantity,
            pricePerUnit: selectedDraftItem.item.pricePerUnit,
          }}
          onLinkProduct={handleLinkProduct}
        />
      )}

      {/* Accept Popup */}
      {showAcceptPopup && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Приёмка товара</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedReceipt.id} от {selectedReceipt.supplier}</p>
              </div>
              <button
                onClick={() => setShowAcceptPopup(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Items weights */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Укажите общий вес каждого вида товара (кг)
                </h3>
                <div className="space-y-3">
                  {weightInputs.map((item) => (
                    <div key={item.itemId} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.quantity} шт</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={item.weight || ''}
                            onChange={(e) => updateWeight(item.itemId, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-500">кг</span>
                        </div>
                      </div>
                      {item.deliveryCost > 0 && (
                        <div className="text-right text-sm text-emerald-600 font-medium">
                          Доставка: {item.deliveryCost.toLocaleString('ru-RU')} ₸
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total weight */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">Общий вес партии:</span>
                  <span className="text-lg font-bold text-blue-700">{getTotalWeight().toFixed(2)} кг</span>
                </div>
              </div>

              {/* Total delivery cost */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Общая сумма за логистику (₸)
                </label>
                <input
                  type="number"
                  value={totalDeliveryCost || ''}
                  onChange={(e) => setTotalDeliveryCost(parseFloat(e.target.value) || 0)}
                  placeholder="Введите сумму"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                />
              </div>

              {/* Calculate button */}
              <button
                onClick={calculateDelivery}
                disabled={getTotalWeight() === 0 || totalDeliveryCost === 0}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors mb-6 cursor-pointer"
              >
                Рассчитать доставку по весу
              </button>

              {/* Calculated summary */}
              {getCalculatedDelivery() > 0 && (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <h4 className="text-sm font-semibold text-emerald-700 mb-3">Распределение доставки:</h4>
                  <div className="space-y-2">
                    {weightInputs.map(item => (
                      <div key={item.itemId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{item.name} ({item.weight} кг)</span>
                        <span className="font-medium text-gray-900">{item.deliveryCost.toLocaleString('ru-RU')} ₸</span>
                      </div>
                    ))}
                    <div className="border-t border-emerald-200 pt-2 mt-2 flex items-center justify-between">
                      <span className="font-semibold text-emerald-700">Итого доставка:</span>
                      <span className="font-bold text-emerald-700">{getCalculatedDelivery().toLocaleString('ru-RU')} ₸</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowAcceptPopup(false)}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={acceptReceipt}
                disabled={getTotalWeight() === 0 || totalDeliveryCost === 0 || getCalculatedDelivery() === 0}
                className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                Подтвердить приёмку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
