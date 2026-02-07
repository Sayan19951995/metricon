'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Package, Search, AlertCircle, RefreshCw, Paperclip, FileText } from 'lucide-react';

// Типы
type ItemType = 'existing' | 'draft';
type Currency = 'KZT' | 'USD' | 'CNY';

interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  flag: string;
}

const currencies: CurrencyInfo[] = [
  { code: 'KZT', symbol: '₸', name: 'Тенге', flag: '🇰🇿' },
  { code: 'USD', symbol: '$', name: 'Доллар', flag: '🇺🇸' },
  { code: 'CNY', symbol: '¥', name: 'Юань', flag: '🇨🇳' },
];

// Примерные курсы (в реальности будут из API)
const defaultRates: Record<Currency, number> = {
  KZT: 1,
  USD: 525,  // 1 USD = 525 KZT
  CNY: 72,   // 1 CNY = 72 KZT
};

interface OrderItem {
  id: string;
  type: ItemType;
  name: string;
  sku?: string;
  productId?: number;
  draftDescription?: string;
  quantity: number;
  pricePerUnit: number;      // Цена в выбранной валюте
  pricePerUnitKZT: number;   // Цена в тенге
  total: number;             // Итого в тенге
}

interface NewOrder {
  supplier: string;
  orderDate: string;
  expectedDate: string;
  items: OrderItem[];
  currency: Currency;
  exchangeRate: number;
  notes?: string;
}

// Mock данные товаров из Kaspi (в реальности будут из API)
const kaspiProducts = [
  { id: 1, name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', price: 449900 },
  { id: 2, name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', price: 389900 },
  { id: 3, name: 'AirPods Pro 2', sku: 'APL-APP2', price: 89900 },
  { id: 4, name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', price: 849900 },
  { id: 5, name: 'iPad Air 5th Gen', sku: 'APL-IPA5', price: 289900 },
  { id: 6, name: 'Apple Watch Ultra', sku: 'APL-AWU', price: 379900 },
  { id: 7, name: 'Sony WH-1000XM5', sku: 'SNY-WH1000', price: 149900 },
  { id: 8, name: 'Samsung Galaxy Tab S9', sku: 'SAM-GTS9', price: 329900 },
  { id: 9, name: 'Google Pixel 8 Pro', sku: 'GGL-PX8P', price: 349900 },
  { id: 10, name: 'Nintendo Switch OLED', sku: 'NTD-SWOLED', price: 159900 },
  { id: 11, name: 'DJI Mini 3 Pro', sku: 'DJI-M3P', price: 379900 },
  { id: 12, name: 'Bose QuietComfort 45', sku: 'BOS-QC45', price: 129900 },
];

const defaultSuppliers = [
  'Guangzhou Electronics Co.',
  'Shenzhen Tech Supply',
  'Hong Kong Gadgets Ltd.',
  'Beijing Mobile Parts',
  'Shanghai Digital Trade',
];

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder: (order: NewOrder) => void;
}

export default function CreateOrderModal({ isOpen, onClose, onCreateOrder }: CreateOrderModalProps) {
  const [supplier, setSupplier] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [suppliers, setSuppliers] = useState<string[]>(defaultSuppliers);

  // Валюта и курс
  const [currency, setCurrency] = useState<Currency>('CNY');
  const [exchangeRate, setExchangeRate] = useState(defaultRates.CNY);
  const [isManualRate, setIsManualRate] = useState(false);

  // Состояния для добавления поставщика
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  // Состояния для добавления товаров
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [showAddDraft, setShowAddDraft] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Состояния для нового черновика
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [draftPrice, setDraftPrice] = useState<number | ''>('');

  // Состояние для прикреплённых файлов
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Обновить курс при смене валюты
  useEffect(() => {
    if (!isManualRate) {
      setExchangeRate(defaultRates[currency]);
    }
  }, [currency, isManualRate]);

  // Пересчитать цены при изменении курса
  useEffect(() => {
    if (items.length > 0) {
      setItems(prev => prev.map(item => ({
        ...item,
        pricePerUnitKZT: Math.round(item.pricePerUnit * exchangeRate),
        total: Math.round(item.quantity * item.pricePerUnit * exchangeRate),
      })));
    }
  }, [exchangeRate]);

  if (!isOpen) return null;

  const currentCurrency = currencies.find(c => c.code === currency)!;

  // Добавить нового поставщика
  const addSupplier = () => {
    if (!newSupplierName.trim()) return;
    if (suppliers.includes(newSupplierName.trim())) {
      setSupplier(newSupplierName.trim());
      setNewSupplierName('');
      setShowAddSupplier(false);
      return;
    }
    setSuppliers(prev => [...prev, newSupplierName.trim()]);
    setSupplier(newSupplierName.trim());
    setNewSupplierName('');
    setShowAddSupplier(false);
  };

  const filteredProducts = kaspiProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Добавить существующий товар
  const addExistingProduct = (product: typeof kaspiProducts[0]) => {
    const existingItem = items.find(i => i.productId === product.id);
    if (existingItem) {
      setItems(prev => prev.map(i =>
        i.productId === product.id
          ? {
              ...i,
              quantity: i.quantity + 1,
              total: Math.round((i.quantity + 1) * i.pricePerUnit * exchangeRate)
            }
          : i
      ));
    } else {
      // Конвертируем розничную цену в закупочную в выбранной валюте
      const retailPriceKZT = product.price;
      const purchasePriceKZT = Math.round(retailPriceKZT * 0.5); // ~50% от розничной
      const priceInCurrency = Math.round(purchasePriceKZT / exchangeRate);

      const newItem: OrderItem = {
        id: `item-${Date.now()}`,
        type: 'existing',
        name: product.name,
        sku: product.sku,
        productId: product.id,
        quantity: 1,
        pricePerUnit: priceInCurrency,
        pricePerUnitKZT: Math.round(priceInCurrency * exchangeRate),
        total: Math.round(priceInCurrency * exchangeRate),
      };
      setItems(prev => [...prev, newItem]);
    }
    setShowAddExisting(false);
    setSearchQuery('');
  };

  // Добавить черновик товара
  const addDraftProduct = () => {
    if (!draftName || draftQuantity <= 0 || !draftPrice || draftPrice <= 0) return;

    const priceKZT = Math.round(draftPrice * exchangeRate);
    const newItem: OrderItem = {
      id: `draft-${Date.now()}`,
      type: 'draft',
      name: draftName,
      draftDescription: draftDescription || undefined,
      quantity: draftQuantity,
      pricePerUnit: draftPrice,
      pricePerUnitKZT: priceKZT,
      total: draftQuantity * priceKZT,
    };
    setItems(prev => [...prev, newItem]);

    setDraftName('');
    setDraftDescription('');
    setDraftQuantity(1);
    setDraftPrice('');
    setShowAddDraft(false);
  };

  // Обновить количество товара
  const updateQuantity = (itemId: string, quantity: number | string) => {
    const qty = typeof quantity === 'string' ? parseInt(quantity) || 0 : quantity;
    if (qty < 0) return;
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, quantity: qty, total: Math.round(qty * i.pricePerUnit * exchangeRate) }
        : i
    ));
  };

  const incrementQuantity = (itemId: string) => {
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, quantity: i.quantity + 1, total: Math.round((i.quantity + 1) * i.pricePerUnit * exchangeRate) }
        : i
    ));
  };

  const decrementQuantity = (itemId: string) => {
    setItems(prev => prev.map(i =>
      i.id === itemId && i.quantity > 1
        ? { ...i, quantity: i.quantity - 1, total: Math.round((i.quantity - 1) * i.pricePerUnit * exchangeRate) }
        : i
    ));
  };

  // Обновить цену товара (в выбранной валюте)
  const updatePrice = (itemId: string, price: number) => {
    if (price < 0) return;
    const priceKZT = Math.round(price * exchangeRate);
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, pricePerUnit: price, pricePerUnitKZT: priceKZT, total: Math.round(i.quantity * price * exchangeRate) }
        : i
    ));
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Сбросить курс к автоматическому
  const resetToAutoRate = () => {
    setIsManualRate(false);
    setExchangeRate(defaultRates[currency]);
  };

  // Расчёт итогов
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmountCurrency = items.reduce((sum, i) => sum + (i.quantity * i.pricePerUnit), 0);
  const totalAmountKZT = items.reduce((sum, i) => sum + i.total, 0);
  const hasDrafts = items.some(i => i.type === 'draft');

  // Создать заказ
  const handleCreateOrder = () => {
    if (!supplier || !expectedDate || items.length === 0) return;

    onCreateOrder({
      supplier,
      orderDate,
      expectedDate,
      items,
      currency,
      exchangeRate,
      notes: notes || undefined,
    });

    // Сброс формы
    setSupplier('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDate('');
    setItems([]);
    setNotes('');
    setAttachedFiles([]);
    setCurrency('CNY');
    setExchangeRate(defaultRates.CNY);
    setIsManualRate(false);
    onClose();
  };

  const canCreate = supplier && orderDate && expectedDate && items.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col sm:mx-4">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Новый заказ</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Создайте заказ поставщику</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Валюта и курс */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Выбор валюты */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1.5">Валюта закупки</label>
                <div className="flex gap-1.5">
                  {currencies.map(curr => (
                    <button
                      key={curr.code}
                      onClick={() => setCurrency(curr.code)}
                      className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                        currency === curr.code
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700'
                      }`}
                    >
                      <span>{curr.flag}</span>
                      <span className="hidden sm:inline">{curr.name}</span>
                      <span className="sm:hidden">{curr.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Курс валюты */}
              {currency !== 'KZT' && (
                <div className="sm:w-48">
                  <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1.5">
                    Курс {currentCurrency.code}/KZT
                  </label>
                  <div className="flex gap-1.5">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={exchangeRate}
                        onChange={(e) => {
                          setIsManualRate(true);
                          setExchangeRate(parseFloat(e.target.value) || 0);
                        }}
                        className="w-full px-3 py-2 text-sm border border-blue-200 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₸</span>
                    </div>
                    {isManualRate && (
                      <button
                        onClick={resetToAutoRate}
                        className="p-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                        title="Сбросить к автокурсу"
                      >
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                    {isManualRate ? 'Ручной курс' : 'Автоматический курс'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Info */}
          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Поставщик */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Поставщик *</label>
              {showAddSupplier ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Название поставщика"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addSupplier();
                      if (e.key === 'Escape') { setShowAddSupplier(false); setNewSupplierName(''); }
                    }}
                  />
                  <button
                    onClick={addSupplier}
                    disabled={!newSupplierName.trim()}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setShowAddSupplier(false); setNewSupplierName(''); }}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Выберите</option>
                    {suppliers.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddSupplier(true)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                    title="Добавить поставщика"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {/* Даты */}
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата заказа *</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ожид. дата *</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Товары в заказе</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddExisting(true); setShowAddDraft(false); }}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Из Kaspi
                </button>
                <button
                  onClick={() => { setShowAddDraft(true); setShowAddExisting(false); }}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-800/50 text-amber-700 dark:text-amber-300 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Новый товар
                </button>
              </div>
            </div>

            {/* Add Existing Product */}
            {showAddExisting && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск товара по названию или SKU..."
                    className="flex-1 bg-transparent text-sm focus:outline-none dark:text-white dark:placeholder-gray-500"
                    autoFocus
                  />
                  <button
                    onClick={() => { setShowAddExisting(false); setSearchQuery(''); }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addExistingProduct(product)}
                      className="w-full p-2 text-left hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{product.sku}</div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{product.price.toLocaleString('ru-RU')} ₸</div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">Товары не найдены</div>
                  )}
                </div>
              </div>
            )}

            {/* Add Draft Product */}
            {showAddDraft && (
              <div className="mb-4 p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">Новый товар (черновик)</span>
                  </div>
                  <button
                    onClick={() => setShowAddDraft(false)}
                    className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 mb-2 sm:mb-3">
                  Этот товар ещё не существует в Kaspi. После получения вы сможете привязать его к карточке Kaspi.
                </p>
                <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3 mb-2 sm:mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Название *</label>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="iPhone 16 Pro 256GB"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
                    <input
                      type="text"
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      placeholder="Цвет: Black Titanium"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Кол-во *</label>
                    <input
                      type="number"
                      value={draftQuantity}
                      onChange={(e) => setDraftQuantity(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Цена ({currentCurrency.symbol}) *</label>
                    <input
                      type="number"
                      value={draftPrice}
                      onChange={(e) => setDraftPrice(parseFloat(e.target.value) || '')}
                      placeholder="0"
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addDraftProduct}
                      disabled={!draftName || draftQuantity <= 0 || !draftPrice || draftPrice <= 0}
                      className="w-full px-2 sm:px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                    >
                      Добавить
                    </button>
                  </div>
                </div>
                {draftPrice && draftPrice > 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">
                    ≈ {Math.round(draftPrice * exchangeRate).toLocaleString('ru-RU')} ₸ за шт
                  </p>
                )}
              </div>
            )}

            {/* Items List */}
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`p-2.5 sm:p-3 rounded-xl border ${item.type === 'draft' ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                  >
                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white text-xs">{item.name}</span>
                            {item.type === 'draft' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                Черновик
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {item.sku || item.draftDescription || 'Без описания'}
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            <button
                              onClick={() => decrementQuantity(item.id)}
                              disabled={item.quantity <= 1}
                              style={{ width: '32px', height: '32px' }}
                              className="flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-300 dark:disabled:text-gray-500 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateQuantity(item.id, e.target.value)}
                              min={0}
                              style={{ width: '48px', height: '32px' }}
                              className="px-1 text-sm font-medium text-center border border-gray-300 dark:border-gray-600 rounded-lg mx-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                            />
                            <button
                              onClick={() => incrementQuantity(item.id)}
                              style={{ width: '32px', height: '32px' }}
                              className="flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">x</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={item.pricePerUnit}
                              onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-16 px-1.5 py-1 text-xs text-right border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{currentCurrency.symbol}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900 dark:text-white text-xs">{item.total.toLocaleString('ru-RU')} ₸</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center gap-3">
                      {/* Название товара */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</span>
                          {item.type === 'draft' && (
                            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                              Черновик
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.sku || item.draftDescription || 'Без описания'}
                        </div>
                      </div>
                      {/* Количество */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center">
                          <button
                            onClick={() => decrementQuantity(item.id)}
                            disabled={item.quantity <= 1}
                            style={{ width: '36px', height: '36px' }}
                            className="flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-300 dark:disabled:text-gray-500 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            min={0}
                            style={{ width: '56px', height: '36px' }}
                            className="px-2 text-sm font-medium text-center border border-gray-300 dark:border-gray-600 rounded-lg mx-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            onClick={() => incrementQuantity(item.id)}
                            style={{ width: '36px', height: '36px' }}
                            className="flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">шт</span>
                      </div>
                      {/* Цена в валюте */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          value={item.pricePerUnit}
                          onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                          style={{ width: '80px' }}
                          className="px-2 py-1.5 text-sm text-right border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-4">{currentCurrency.symbol}</span>
                      </div>
                      {/* Итого в тенге */}
                      <div style={{ width: '110px' }} className="text-right flex-shrink-0">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{item.total.toLocaleString('ru-RU')} ₸</span>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          {(item.quantity * item.pricePerUnit).toLocaleString('ru-RU')} {currentCurrency.symbol}
                        </div>
                      </div>
                      {/* Удалить */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 sm:p-8 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Добавьте товары в заказ</p>
                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">Выберите товары из Kaspi или добавьте новые</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Комментарий</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Номер заказа, трек-номер, контакты..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Прикрепить файл */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Накладная / документы</label>

            {/* Список прикреплённых файлов */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                  >
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                      className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Кнопка добавления файла */}
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer">
              <Paperclip className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Прикрепить файл</span>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">PDF, JPG, PNG, DOC, XLS (макс. 10 МБ)</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {/* Summary */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Товаров: <span className="font-semibold text-gray-900 dark:text-white">{totalItems} шт</span>
              </div>
              {hasDrafts && (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Есть черновики</span>
                  <span className="sm:hidden">Черновики</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {totalAmountKZT.toLocaleString('ru-RU')} ₸
              </div>
              {currency !== 'KZT' && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {totalAmountCurrency.toLocaleString('ru-RU')} {currentCurrency.symbol}
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm sm:text-base font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={!canCreate}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl text-sm sm:text-base font-medium transition-colors cursor-pointer"
            >
              Создать заказ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
