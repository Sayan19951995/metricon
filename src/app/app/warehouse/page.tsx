'use client';

import { useState } from 'react';
import { Search, Filter, Package, CheckCircle, AlertTriangle, XCircle, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, FileText, Truck, MapPin, Plus, Settings, Building2 } from 'lucide-react';
import CreateOrderModal from '@/components/warehouse/CreateOrderModal';

// Интерфейс склада
interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  type: 'main' | 'secondary' | 'partner';
  isActive: boolean;
}

// Mock данные складов
const warehouses: Warehouse[] = [
  { id: 'wh-1', name: 'Основной склад', address: 'ул. Абая 150, офис 12', city: 'Алматы', type: 'main', isActive: true },
  { id: 'wh-2', name: 'Склад Астана', address: 'пр. Мангилик Ел 55', city: 'Астана', type: 'secondary', isActive: true },
  { id: 'wh-3', name: 'Партнерский склад', address: 'ул. Толе би 88', city: 'Алматы', type: 'partner', isActive: true },
];

// Mock данные товаров на складе с детальной информацией о закупке
const warehouseProducts = [
  {
    id: 1, name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', category: 'Смартфоны',
    stock: 45, minStock: 10, image: '📱', inTransit: false, inTransitQty: 0,
    orderDate: '2025-10-15', arrivalDate: '2025-11-02', transitDays: 18,
    pricePerUnit: 350000, quantity: 50, totalPrice: 17500000,
    weight: 0.24, deliveryPerUnit: 2500, deliveryTotal: 125000,
    totalCost: 17625000, costPerUnit: 352500,
    invoice: 'INV-2025-001.pdf',
    salePrice: 449900, commissionTax: 44990, profit: 52410,
    warehouseId: 'wh-1'
  },
  {
    id: 2, name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', category: 'Смартфоны',
    stock: 12, minStock: 10, image: '📱', inTransit: false, inTransitQty: 0,
    orderDate: '2025-10-20', arrivalDate: '2025-11-05', transitDays: 16,
    pricePerUnit: 295000, quantity: 20, totalPrice: 5900000,
    weight: 0.23, deliveryPerUnit: 2300, deliveryTotal: 46000,
    totalCost: 5946000, costPerUnit: 297300,
    invoice: 'INV-2025-002.pdf',
    salePrice: 389900, commissionTax: 38990, profit: 53610,
    warehouseId: 'wh-1'
  },
  {
    id: 3, name: 'AirPods Pro 2', sku: 'APL-APP2', category: 'Аксессуары',
    stock: 8, minStock: 15, image: '🎧', inTransit: true, inTransitQty: 20,
    orderDate: '2025-10-25', arrivalDate: '2025-11-08', transitDays: 14,
    pricePerUnit: 58000, quantity: 30, totalPrice: 1740000,
    weight: 0.06, deliveryPerUnit: 800, deliveryTotal: 24000,
    totalCost: 1764000, costPerUnit: 58800,
    invoice: 'INV-2025-003.pdf',
    salePrice: 89900, commissionTax: 8990, profit: 22110,
    warehouseId: 'wh-2'
  },
  {
    id: 4, name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', category: 'Ноутбуки',
    stock: 3, minStock: 5, image: '💻', inTransit: true, inTransitQty: 10,
    orderDate: '2025-10-10', arrivalDate: '2025-10-28', transitDays: 18,
    pricePerUnit: 680000, quantity: 10, totalPrice: 6800000,
    weight: 1.6, deliveryPerUnit: 8000, deliveryTotal: 80000,
    totalCost: 6880000, costPerUnit: 688000,
    invoice: 'INV-2025-004.pdf',
    salePrice: 849900, commissionTax: 84990, profit: 76910,
    warehouseId: 'wh-1'
  },
  {
    id: 5, name: 'iPad Air 5th Gen', sku: 'APL-IPA5', category: 'Планшеты',
    stock: 0, minStock: 8, image: '📲', inTransit: true, inTransitQty: 15,
    orderDate: '2025-09-28', arrivalDate: '2025-10-15', transitDays: 17,
    pricePerUnit: 210000, quantity: 15, totalPrice: 3150000,
    weight: 0.46, deliveryPerUnit: 3000, deliveryTotal: 45000,
    totalCost: 3195000, costPerUnit: 213000,
    invoice: 'INV-2025-005.pdf',
    salePrice: 289900, commissionTax: 28990, profit: 47910,
    warehouseId: 'wh-2'
  },
  {
    id: 6, name: 'Apple Watch Ultra', sku: 'APL-AWU', category: 'Часы',
    stock: 28, minStock: 10, image: '⌚', inTransit: false, inTransitQty: 0,
    orderDate: '2025-11-01', arrivalDate: '2025-11-15', transitDays: 14,
    pricePerUnit: 285000, quantity: 35, totalPrice: 9975000,
    weight: 0.08, deliveryPerUnit: 1200, deliveryTotal: 42000,
    totalCost: 10017000, costPerUnit: 286200,
    invoice: 'INV-2025-006.pdf',
    salePrice: 379900, commissionTax: 37990, profit: 55710,
    warehouseId: 'wh-1'
  },
  {
    id: 7, name: 'Sony WH-1000XM5', sku: 'SNY-WH1000', category: 'Аксессуары',
    stock: 15, minStock: 10, image: '🎧', inTransit: false, inTransitQty: 0,
    orderDate: '2025-10-18', arrivalDate: '2025-11-01', transitDays: 14,
    pricePerUnit: 95000, quantity: 25, totalPrice: 2375000,
    weight: 0.25, deliveryPerUnit: 1500, deliveryTotal: 37500,
    totalCost: 2412500, costPerUnit: 96500,
    invoice: 'INV-2025-007.pdf',
    salePrice: 149900, commissionTax: 14990, profit: 38410,
    warehouseId: 'wh-3'
  },
  {
    id: 8, name: 'Samsung Galaxy Tab S9', sku: 'SAM-GTS9', category: 'Планшеты',
    stock: 52, minStock: 15, image: '📲', inTransit: false, inTransitQty: 0,
    orderDate: '2025-10-22', arrivalDate: '2025-11-06', transitDays: 15,
    pricePerUnit: 235000, quantity: 60, totalPrice: 14100000,
    weight: 0.5, deliveryPerUnit: 2800, deliveryTotal: 168000,
    totalCost: 14268000, costPerUnit: 237800,
    invoice: 'INV-2025-008.pdf',
    salePrice: 329900, commissionTax: 32990, profit: 59110,
    warehouseId: 'wh-1'
  },
  {
    id: 9, name: 'Google Pixel 8 Pro', sku: 'GGL-PX8P', category: 'Смартфоны',
    stock: 6, minStock: 10, image: '📱', inTransit: false, inTransitQty: 0,
    orderDate: '2025-10-28', arrivalDate: '2025-11-12', transitDays: 15,
    pricePerUnit: 255000, quantity: 15, totalPrice: 3825000,
    weight: 0.21, deliveryPerUnit: 2200, deliveryTotal: 33000,
    totalCost: 3858000, costPerUnit: 257200,
    invoice: 'INV-2025-009.pdf',
    salePrice: 349900, commissionTax: 34990, profit: 57710,
    warehouseId: 'wh-2'
  },
  {
    id: 10, name: 'Nintendo Switch OLED', sku: 'NTD-SWOLED', category: 'Игровые консоли',
    stock: 19, minStock: 10, image: '🎮', inTransit: false, inTransitQty: 0,
    orderDate: '2025-10-12', arrivalDate: '2025-10-27', transitDays: 15,
    pricePerUnit: 110000, quantity: 30, totalPrice: 3300000,
    weight: 0.42, deliveryPerUnit: 2500, deliveryTotal: 75000,
    totalCost: 3375000, costPerUnit: 112500,
    invoice: 'INV-2025-010.pdf',
    salePrice: 159900, commissionTax: 15990, profit: 31410,
    warehouseId: 'wh-3'
  },
  {
    id: 11, name: 'DJI Mini 3 Pro', sku: 'DJI-M3P', category: 'Дроны',
    stock: 4, minStock: 5, image: '🚁', inTransit: false, inTransitQty: 0,
    orderDate: '2025-10-05', arrivalDate: '2025-10-22', transitDays: 17,
    pricePerUnit: 275000, quantity: 10, totalPrice: 2750000,
    weight: 0.25, deliveryPerUnit: 3500, deliveryTotal: 35000,
    totalCost: 2785000, costPerUnit: 278500,
    invoice: 'INV-2025-011.pdf',
    salePrice: 379900, commissionTax: 37990, profit: 63410,
    warehouseId: 'wh-1'
  },
  {
    id: 12, name: 'Bose QuietComfort 45', sku: 'BOS-QC45', category: 'Аксессуары',
    stock: 0, minStock: 8, image: '🎧', inTransit: false, inTransitQty: 0,
    orderDate: '2025-09-20', arrivalDate: '2025-10-05', transitDays: 15,
    pricePerUnit: 82000, quantity: 20, totalPrice: 1640000,
    weight: 0.24, deliveryPerUnit: 1400, deliveryTotal: 28000,
    totalCost: 1668000, costPerUnit: 83400,
    invoice: 'INV-2025-012.pdf',
    salePrice: 129900, commissionTax: 12990, profit: 33510,
    warehouseId: 'wh-2'
  },
];

const categories = ['Все', 'Смартфоны', 'Ноутбуки', 'Планшеты', 'Аксессуары', 'Часы', 'Игровые консоли', 'Дроны'];

type StatusFilter = 'all' | 'in_stock' | 'in_transit' | 'low' | 'out';
type SortField = 'name' | 'category' | 'stock' | 'minStock' | 'costPerUnit' | 'stockValue' | 'status' | 'orderDate' | 'arrivalDate' | 'transitDays' | 'pricePerUnit' | 'quantity' | 'totalPrice' | 'weight' | 'deliveryPerUnit' | 'deliveryTotal' | 'totalCost' | 'salePrice' | 'commissionTax' | 'profit' | 'roi';
type SortDirection = 'asc' | 'desc';
type DetailLevel = 'min' | 'medium' | 'max';

const detailLevels = [
  { value: 'min' as DetailLevel, label: 'Минимум' },
  { value: 'medium' as DetailLevel, label: 'Средняя' },
  { value: 'max' as DetailLevel, label: 'Максимальная' },
];

export default function WarehousePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('Все');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDetailDropdown, setShowDetailDropdown] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('min');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

  // Функция определения статуса товара
  const getStatus = (stock: number, minStock: number) => {
    if (stock === 0) return 'out';
    if (stock < minStock) return 'low';
    return 'in_stock';
  };

  // Функция сортировки
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Иконка сортировки
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />;
  };

  // Фильтрация товаров
  const filteredProducts = warehouseProducts.filter(product => {
    // Поиск по названию или артикулу
    const matchesSearch = searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    // Фильтр по статусу
    const status = getStatus(product.stock, product.minStock);
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'in_transit' ? product.inTransit : status === statusFilter);

    // Фильтр по категории
    const matchesCategory = categoryFilter === 'Все' || product.category === categoryFilter;

    // Фильтр по складу
    const matchesWarehouse = selectedWarehouse === 'all' || product.warehouseId === selectedWarehouse;

    return matchesSearch && matchesStatus && matchesCategory && matchesWarehouse;
  });

  // Сортировка товаров
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      case 'stock':
        comparison = a.stock - b.stock;
        break;
      case 'minStock':
        comparison = a.minStock - b.minStock;
        break;
      case 'costPerUnit':
        comparison = a.costPerUnit - b.costPerUnit;
        break;
      case 'stockValue':
        comparison = (a.stock * a.costPerUnit) - (b.stock * b.costPerUnit);
        break;
      case 'status':
        const statusOrder = { out: 0, low: 1, in_stock: 2 };
        const statusA = getStatus(a.stock, a.minStock);
        const statusB = getStatus(b.stock, b.minStock);
        comparison = statusOrder[statusA] - statusOrder[statusB];
        break;
      case 'orderDate':
        comparison = a.orderDate.localeCompare(b.orderDate);
        break;
      case 'arrivalDate':
        comparison = a.arrivalDate.localeCompare(b.arrivalDate);
        break;
      case 'transitDays':
        comparison = a.transitDays - b.transitDays;
        break;
      case 'pricePerUnit':
        comparison = a.pricePerUnit - b.pricePerUnit;
        break;
      case 'quantity':
        comparison = a.quantity - b.quantity;
        break;
      case 'totalPrice':
        comparison = a.totalPrice - b.totalPrice;
        break;
      case 'weight':
        comparison = a.weight - b.weight;
        break;
      case 'deliveryPerUnit':
        comparison = a.deliveryPerUnit - b.deliveryPerUnit;
        break;
      case 'deliveryTotal':
        comparison = a.deliveryTotal - b.deliveryTotal;
        break;
      case 'totalCost':
        comparison = a.totalCost - b.totalCost;
        break;
      case 'salePrice':
        comparison = a.salePrice - b.salePrice;
        break;
      case 'commissionTax':
        comparison = a.commissionTax - b.commissionTax;
        break;
      case 'profit':
        comparison = a.profit - b.profit;
        break;
      case 'roi':
        const roiA = (a.profit / a.costPerUnit) * 100;
        const roiB = (b.profit / b.costPerUnit) * 100;
        comparison = roiA - roiB;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Подсчет статистики для выбранного склада
  const getStats = (products: typeof warehouseProducts) => ({
    total: products.length,
    inStock: products.filter(p => getStatus(p.stock, p.minStock) === 'in_stock').length,
    low: products.filter(p => getStatus(p.stock, p.minStock) === 'low').length,
    out: products.filter(p => getStatus(p.stock, p.minStock) === 'out').length,
    inTransit: products.filter(p => p.inTransit).length,
    inTransitUnits: products.reduce((sum, p) => sum + p.inTransitQty, 0),
    totalUnits: products.reduce((sum, p) => sum + p.stock, 0),
    totalValue: products.reduce((sum, p) => sum + (p.stock * p.costPerUnit), 0),
  });

  // Статистика для текущего фильтра склада
  const currentProducts = selectedWarehouse === 'all'
    ? warehouseProducts
    : warehouseProducts.filter(p => p.warehouseId === selectedWarehouse);
  const stats = getStats(currentProducts);

  // Статистика по каждому складу
  const warehouseStats = warehouses.map(wh => {
    const products = warehouseProducts.filter(p => p.warehouseId === wh.id);
    return {
      ...wh,
      stats: getStats(products)
    };
  });

  const getWarehouseTypeLabel = (type: Warehouse['type']) => {
    switch (type) {
      case 'main': return 'Основной';
      case 'secondary': return 'Филиал';
      case 'partner': return 'Партнёрский';
    }
  };

  const getWarehouseTypeColor = (type: Warehouse['type']) => {
    switch (type) {
      case 'main': return 'bg-emerald-100 text-emerald-700';
      case 'secondary': return 'bg-blue-100 text-blue-700';
      case 'partner': return 'bg-purple-100 text-purple-700';
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Склад</h1>
          <p className="text-sm text-gray-500 mt-1">Управление остатками товаров</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowWarehouseModal(true)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Управление</span>
          </button>
          <a
            href="/app/warehouse/history"
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            История
          </a>
          <button
            onClick={() => setShowCreateOrderModal(true)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium text-sm cursor-pointer flex-1 sm:flex-none"
          >
            + Заказ
          </button>
        </div>
      </div>

      {/* Warehouse Selector Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Все склады */}
        <div
          className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer transition-all border-2 ${
            selectedWarehouse === 'all' ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-gray-200'
          }`}
          onClick={() => setSelectedWarehouse('all')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Все склады</div>
              <div className="text-xs text-gray-500">{warehouses.length} локаций</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{getStats(warehouseProducts).totalUnits} шт</span>
            <span className="font-semibold text-gray-900">{(getStats(warehouseProducts).totalValue / 1000000).toFixed(1)}M ₸</span>
          </div>
        </div>

        {/* Индивидуальные склады */}
        {warehouseStats.map(wh => (
          <div
            key={wh.id}
            className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer transition-all border-2 ${
              selectedWarehouse === wh.id ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-gray-200'
            }`}
            onClick={() => setSelectedWarehouse(wh.id)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                wh.type === 'main' ? 'bg-emerald-100' : wh.type === 'secondary' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                <MapPin className={`w-5 h-5 ${
                  wh.type === 'main' ? 'text-emerald-600' : wh.type === 'secondary' ? 'text-blue-600' : 'text-purple-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{wh.name}</div>
                <div className="text-xs text-gray-500 truncate">{wh.city}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getWarehouseTypeColor(wh.type)}`}>
                {getWarehouseTypeLabel(wh.type)}
              </span>
              <span className="text-sm font-semibold text-gray-900">{wh.stats.totalUnits} шт</span>
            </div>
            {wh.stats.low > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                {wh.stats.low} позиций заканчивается
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div
          className={`bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-gray-600 text-sm">Всего товаров</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.totalUnits} единиц на {(stats.totalValue / 1000000).toFixed(1)}M ₸</div>
        </div>

        <div
          className={`bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'in_stock' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'in_stock' ? 'all' : 'in_stock')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-gray-600 text-sm">В наличии</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.inStock}</div>
          <div className="text-xs text-gray-500 mt-1">позиций</div>
        </div>

        <div
          className={`bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'in_transit' ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'in_transit' ? 'all' : 'in_transit')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-600 text-sm">В пути</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{stats.inTransit}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.inTransitUnits} единиц</div>
        </div>

        <div
          className={`bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'low' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-gray-600 text-sm">Заканчивается</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.low}</div>
          <div className="text-xs text-gray-500 mt-1">позиций</div>
        </div>

        <div
          className={`bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${statusFilter === 'out' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'out' ? 'all' : 'out')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-600 text-sm">Нет в наличии</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.out}</div>
          <div className="text-xs text-gray-500 mt-1">позиций</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или артикулу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              style={{ paddingLeft: '44px', paddingRight: '16px' }}
            />
          </div>

          {/* Warehouse Filter */}
          <div className="relative">
            <button
              onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {selectedWarehouse === 'all'
                    ? 'Все склады'
                    : warehouses.find(w => w.id === selectedWarehouse)?.name
                  }
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showWarehouseDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showWarehouseDropdown && (
              <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-2">
                <button
                  onClick={() => {
                    setSelectedWarehouse('all');
                    setShowWarehouseDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                    selectedWarehouse === 'all' ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-700'
                  }`}
                >
                  Все склады
                </button>
                {warehouses.map((wh) => (
                  <button
                    key={wh.id}
                    onClick={() => {
                      setSelectedWarehouse(wh.id);
                      setShowWarehouseDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                      selectedWarehouse === wh.id ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{wh.name}</span>
                      <span className="text-xs text-gray-400">{wh.city}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{categoryFilter}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCategoryDropdown && (
              <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setCategoryFilter(category);
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                      categoryFilter === category ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail Level Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDetailDropdown(!showDetailDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Детализация:</span>
                <span className="text-gray-700 font-medium">
                  {detailLevels.find(d => d.value === detailLevel)?.label}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDetailDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDetailDropdown && (
              <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-2">
                {detailLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => {
                      setDetailLevel(level.value);
                      setShowDetailDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                      detailLevel === level.value ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-700'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Товар - всегда показывается */}
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors sticky left-0 bg-gray-50 z-10"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1.5">
                    Товар
                    <SortIcon field="name" />
                  </div>
                </th>

                {/* Склад - показывать если "Все склады" */}
                {selectedWarehouse === 'all' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Склад
                  </th>
                )}

                {/* Дата заказа - medium, max */}
                {(detailLevel === 'medium' || detailLevel === 'max') && (
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('orderDate')}
                  >
                    <div className="flex items-center gap-1.5">
                      Дата заказа
                      <SortIcon field="orderDate" />
                    </div>
                  </th>
                )}

                {/* Дата прибытия - medium, max */}
                {(detailLevel === 'medium' || detailLevel === 'max') && (
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('arrivalDate')}
                  >
                    <div className="flex items-center gap-1.5">
                      Дата прибытия
                      <SortIcon field="arrivalDate" />
                    </div>
                  </th>
                )}

                {/* В пути кол-во - только min */}
                {detailLevel === 'min' && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'center' }}
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      В пути
                      <SortIcon field="quantity" />
                    </div>
                  </th>
                )}

                {/* В пути дней - medium, max */}
                {(detailLevel === 'medium' || detailLevel === 'max') && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'center' }}
                    onClick={() => handleSort('transitDays')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      В пути дней
                      <SortIcon field="transitDays" />
                    </div>
                  </th>
                )}

                {/* KZT/шт - только max */}
                {detailLevel === 'max' && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'right' }}
                    onClick={() => handleSort('pricePerUnit')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      KZT/шт
                      <SortIcon field="pricePerUnit" />
                    </div>
                  </th>
                )}

                {/* Кол-во - medium, max */}
                {(detailLevel === 'medium' || detailLevel === 'max') && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'center' }}
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Кол-во
                      <SortIcon field="quantity" />
                    </div>
                  </th>
                )}

                {/* Общее KZT - только max */}
                {detailLevel === 'max' && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'right' }}
                    onClick={() => handleSort('totalPrice')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Общее KZT
                      <SortIcon field="totalPrice" />
                    </div>
                  </th>
                )}

                {/* Вес - только max */}
                {detailLevel === 'max' && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'center' }}
                    onClick={() => handleSort('weight')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Вес
                      <SortIcon field="weight" />
                    </div>
                  </th>
                )}

                {/* Дост/шт - только max */}
                {detailLevel === 'max' && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'right' }}
                    onClick={() => handleSort('deliveryPerUnit')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Дост/шт
                      <SortIcon field="deliveryPerUnit" />
                    </div>
                  </th>
                )}

                {/* Сумма дост - только max */}
                {detailLevel === 'max' && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'right' }}
                    onClick={() => handleSort('deliveryTotal')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Сумма дост
                      <SortIcon field="deliveryTotal" />
                    </div>
                  </th>
                )}

                {/* Себестоимость - всегда */}
                <th
                  className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  style={{ textAlign: 'right' }}
                  onClick={() => handleSort(detailLevel === 'min' ? 'totalCost' : 'costPerUnit')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {detailLevel === 'min' ? 'Общ. себест' : 'Себестоимость'}
                    <SortIcon field={detailLevel === 'min' ? 'totalCost' : 'costPerUnit'} />
                  </div>
                </th>

                {/* Накладная - medium, max */}
                {(detailLevel === 'medium' || detailLevel === 'max') && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'center' }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Накладная
                    </div>
                  </th>
                )}

                {/* Доход - всегда */}
                <th
                  className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  style={{ textAlign: 'right' }}
                  onClick={() => handleSort('salePrice')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {detailLevel === 'min' ? 'Общ. доход' : 'Доход'}
                    <SortIcon field="salePrice" />
                  </div>
                </th>

                {/* Комиссия+налог - только max */}
                {detailLevel === 'max' && (
                  <th
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ textAlign: 'right' }}
                    onClick={() => handleSort('commissionTax')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Комиссия+налог
                      <SortIcon field="commissionTax" />
                    </div>
                  </th>
                )}

                {/* Прибыль - всегда */}
                <th
                  className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  style={{ textAlign: 'right' }}
                  onClick={() => handleSort('profit')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {detailLevel === 'min' ? 'Общ. прибыль' : 'Прибыль'}
                    <SortIcon field="profit" />
                  </div>
                </th>

                {/* ROI - всегда */}
                <th
                  className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  style={{ textAlign: 'center' }}
                  onClick={() => handleSort('roi')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    ROI %
                    <SortIcon field="roi" />
                  </div>
                </th>

                {/* Остаток - всегда */}
                <th
                  className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  style={{ textAlign: 'center' }}
                  onClick={() => handleSort('stock')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    Остаток
                    <SortIcon field="stock" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  style={{ textAlign: 'center' }}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    Статус
                    <SortIcon field="status" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProducts.map((product) => {
                const status = getStatus(product.stock, product.minStock);
                const warehouse = warehouses.find(w => w.id === product.warehouseId);

                // Форматирование даты из YYYY-MM-DD в DD.MM.YY
                const formatDate = (dateStr: string) => {
                  const [year, month, day] = dateStr.split('-');
                  return `${day}.${month}.${year.slice(2)}`;
                };

                const roi = (product.profit / product.costPerUnit) * 100;

                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    {/* Товар - всегда */}
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                          {product.image}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.sku}</div>
                        </div>
                      </div>
                    </td>

                    {/* Склад */}
                    {selectedWarehouse === 'all' && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full ${getWarehouseTypeColor(warehouse?.type || 'main')}`}>
                          {warehouse?.name}
                        </span>
                      </td>
                    )}

                    {/* Дата заказа - medium, max */}
                    {(detailLevel === 'medium' || detailLevel === 'max') && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{formatDate(product.orderDate)}</span>
                      </td>
                    )}

                    {/* Дата прибытия - medium, max */}
                    {(detailLevel === 'medium' || detailLevel === 'max') && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{formatDate(product.arrivalDate)}</span>
                      </td>
                    )}

                    {/* В пути кол-во - только min */}
                    {detailLevel === 'min' && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'center' }}>
                        <span className="text-sm text-purple-600 font-medium">{product.quantity} шт</span>
                      </td>
                    )}

                    {/* В пути дней - medium, max */}
                    {(detailLevel === 'medium' || detailLevel === 'max') && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'center' }}>
                        <span className="text-sm text-gray-600">{product.transitDays} дн</span>
                      </td>
                    )}

                    {/* KZT/шт - только max */}
                    {detailLevel === 'max' && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'right' }}>
                        <span className="text-sm text-gray-600">{product.pricePerUnit.toLocaleString('ru-RU')} ₸</span>
                      </td>
                    )}

                    {/* Кол-во - medium, max */}
                    {(detailLevel === 'medium' || detailLevel === 'max') && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'center' }}>
                        <span className="text-sm text-gray-600">{product.quantity}</span>
                      </td>
                    )}

                    {/* Общее KZT - только max */}
                    {detailLevel === 'max' && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'right' }}>
                        <span className="text-sm text-gray-600">{product.totalPrice.toLocaleString('ru-RU')} ₸</span>
                      </td>
                    )}

                    {/* Вес - только max */}
                    {detailLevel === 'max' && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'center' }}>
                        <span className="text-sm text-gray-600">{product.weight} кг</span>
                      </td>
                    )}

                    {/* Дост/шт - только max */}
                    {detailLevel === 'max' && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'right' }}>
                        <span className="text-sm text-gray-600">{product.deliveryPerUnit.toLocaleString('ru-RU')} ₸</span>
                      </td>
                    )}

                    {/* Сумма дост - только max */}
                    {detailLevel === 'max' && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'right' }}>
                        <span className="text-sm text-gray-600">{product.deliveryTotal.toLocaleString('ru-RU')} ₸</span>
                      </td>
                    )}

                    {/* Себестоимость - всегда */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'right' }}>
                      <span className="text-sm font-medium text-gray-900">
                        {detailLevel === 'min'
                          ? product.totalCost.toLocaleString('ru-RU')
                          : product.costPerUnit.toLocaleString('ru-RU')} ₸
                      </span>
                    </td>

                    {/* Накладная - medium, max */}
                    {(detailLevel === 'medium' || detailLevel === 'max') && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'center' }}>
                        <button className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm cursor-pointer">
                          <FileText className="w-4 h-4" />
                          <span className="underline">{product.invoice}</span>
                        </button>
                      </td>
                    )}

                    {/* Доход - всегда */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'right' }}>
                      <span className="text-sm text-gray-600">
                        {detailLevel === 'min'
                          ? (product.salePrice * product.quantity).toLocaleString('ru-RU')
                          : product.salePrice.toLocaleString('ru-RU')} ₸
                      </span>
                    </td>

                    {/* Комиссия+налог - только max */}
                    {detailLevel === 'max' && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'right' }}>
                        <span className="text-sm text-red-600">-{product.commissionTax.toLocaleString('ru-RU')} ₸</span>
                      </td>
                    )}

                    {/* Прибыль - всегда */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'right' }}>
                      <span className="text-sm font-medium text-emerald-600">
                        {detailLevel === 'min'
                          ? (product.profit * product.quantity).toLocaleString('ru-RU')
                          : product.profit.toLocaleString('ru-RU')} ₸
                      </span>
                    </td>

                    {/* ROI - всегда */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'center' }}>
                      <span className={`text-sm font-medium ${roi >= 15 ? 'text-emerald-600' : roi >= 10 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {roi.toFixed(1)}%
                      </span>
                    </td>

                    {/* Остаток - всегда */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'center' }}>
                      <span className="text-sm text-gray-900">{product.stock} шт</span>
                    </td>

                    {/* Статус - всегда */}
                    <td className="px-4 py-3 whitespace-nowrap" style={{ textAlign: 'center' }}>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          status === 'out' ? 'bg-red-100 text-red-700' :
                          status === 'low' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {status === 'out' && <><XCircle className="w-3 h-3" /> Нет</>}
                          {status === 'low' && <><AlertTriangle className="w-3 h-3" /> Мало</>}
                          {status === 'in_stock' && <><CheckCircle className="w-3 h-3" /> Есть</>}
                        </span>
                        {product.inTransit && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            <Truck className="w-3 h-3" /> В пути
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Товары не найдены</h3>
            <p className="text-gray-500">Попробуйте изменить параметры поиска или фильтры</p>
          </div>
        )}

        {/* Footer */}
        {filteredProducts.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Показано {filteredProducts.length} из {currentProducts.length} товаров
                {selectedWarehouse !== 'all' && ` на складе "${warehouses.find(w => w.id === selectedWarehouse)?.name}"`}
              </span>
              <div className="text-sm">
                <span className="text-gray-500">Общая стоимость остатков: </span>
                <span className="font-bold text-gray-900">
                  {filteredProducts.reduce((sum, p) => sum + (p.stock * p.costPerUnit), 0).toLocaleString('ru-RU')} ₸
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно создания заказа */}
      <CreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        onCreateOrder={(order) => {
          console.log('Создан заказ:', order);
          setShowCreateOrderModal(false);
        }}
      />

      {/* Модальное окно управления складами */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Управление складами</h2>
                <p className="text-sm text-gray-500 mt-1">Добавляйте и редактируйте склады</p>
              </div>
              <button
                onClick={() => setShowWarehouseModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {warehouses.map(wh => (
                  <div key={wh.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          wh.type === 'main' ? 'bg-emerald-100' : wh.type === 'secondary' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          <MapPin className={`w-6 h-6 ${
                            wh.type === 'main' ? 'text-emerald-600' : wh.type === 'secondary' ? 'text-blue-600' : 'text-purple-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{wh.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getWarehouseTypeColor(wh.type)}`}>
                              {getWarehouseTypeLabel(wh.type)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{wh.address}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{wh.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                          <Settings className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {warehouseProducts.filter(p => p.warehouseId === wh.id).length} позиций
                      </span>
                      <span className="font-medium text-gray-900">
                        {warehouseProducts.filter(p => p.warehouseId === wh.id).reduce((sum, p) => sum + p.stock, 0)} единиц
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Warehouse Button */}
              <button className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Plus className="w-5 h-5" />
                Добавить новый склад
              </button>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowWarehouseModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
