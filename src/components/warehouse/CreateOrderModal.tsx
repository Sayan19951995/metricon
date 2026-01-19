'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Package, Search, AlertCircle } from 'lucide-react';

// Типы
type ItemType = 'existing' | 'draft';

interface OrderItem {
  id: string;
  type: ItemType;
  name: string;
  sku?: string;
  productId?: number;
  draftDescription?: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

interface NewOrder {
  supplier: string;
  orderDate: string;
  expectedDate: string;
  items: OrderItem[];
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
  'Apple Inc.',
  'Samsung Electronics',
  'Sony Corporation',
  'Google LLC',
  'Nintendo Co., Ltd.',
  'DJI Technology',
  'Bose Corporation',
];

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder: (order: NewOrder) => void;
}

export default function CreateOrderModal({ isOpen, onClose, onCreateOrder }: CreateOrderModalProps) {
  const [supplier, setSupplier] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]); // Сегодня по умолчанию
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [suppliers, setSuppliers] = useState<string[]>(defaultSuppliers);

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
  const [draftPrice, setDraftPrice] = useState(0);

  if (!isOpen) return null;

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
      // Увеличить количество
      setItems(prev => prev.map(i =>
        i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.pricePerUnit }
          : i
      ));
    } else {
      // Добавить новый
      const newItem: OrderItem = {
        id: `item-${Date.now()}`,
        type: 'existing',
        name: product.name,
        sku: product.sku,
        productId: product.id,
        quantity: 1,
        pricePerUnit: Math.round(product.price * 0.7), // Примерная закупочная цена (70% от розничной)
        total: Math.round(product.price * 0.7),
      };
      setItems(prev => [...prev, newItem]);
    }
    setShowAddExisting(false);
    setSearchQuery('');
  };

  // Добавить черновик товара
  const addDraftProduct = () => {
    if (!draftName || draftQuantity <= 0 || draftPrice <= 0) return;

    const newItem: OrderItem = {
      id: `draft-${Date.now()}`,
      type: 'draft',
      name: draftName,
      draftDescription: draftDescription || undefined,
      quantity: draftQuantity,
      pricePerUnit: draftPrice,
      total: draftQuantity * draftPrice,
    };
    setItems(prev => [...prev, newItem]);

    // Сброс формы
    setDraftName('');
    setDraftDescription('');
    setDraftQuantity(1);
    setDraftPrice(0);
    setShowAddDraft(false);
  };

  // Обновить количество товара
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) return;
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, quantity, total: quantity * i.pricePerUnit }
        : i
    ));
  };

  // Обновить цену товара
  const updatePrice = (itemId: string, price: number) => {
    if (price < 0) return;
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, pricePerUnit: price, total: i.quantity * price }
        : i
    ));
  };

  // Удалить товар
  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Расчёт итогов
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
  const hasDrafts = items.some(i => i.type === 'draft');

  // Создать заказ
  const handleCreateOrder = () => {
    if (!supplier || !expectedDate || items.length === 0) return;

    onCreateOrder({
      supplier,
      orderDate,
      expectedDate,
      items,
      notes: notes || undefined,
    });

    // Сброс формы
    setSupplier('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDate('');
    setItems([]);
    setNotes('');
    onClose();
  };

  const canCreate = supplier && orderDate && expectedDate && items.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col sm:mx-4">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Новый заказ на пополнение</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Создайте заказ поставщику</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Order Info */}
          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Поставщик - полная ширина на мобильных */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Поставщик *</label>
              {showAddSupplier ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Название поставщика"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Выберите</option>
                    {suppliers.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddSupplier(true)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                    title="Добавить поставщика"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {/* Даты в одну строку на мобильных */}
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Дата заказа *</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Ожид. дата *</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Товары в заказе</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddExisting(true); setShowAddDraft(false); }}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Из Kaspi
                </button>
                <button
                  onClick={() => { setShowAddDraft(true); setShowAddExisting(false); }}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Новый товар
                </button>
              </div>
            </div>

            {/* Add Existing Product */}
            {showAddExisting && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск товара по названию или SKU..."
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => { setShowAddExisting(false); setSearchQuery(''); }}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addExistingProduct(product)}
                      className="w-full p-2 text-left hover:bg-white rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.sku}</div>
                      </div>
                      <div className="text-sm text-gray-600">{product.price.toLocaleString('ru-RU')} ₸</div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center text-sm text-gray-500 py-4">Товары не найдены</div>
                  )}
                </div>
              </div>
            )}

            {/* Add Draft Product */}
            {showAddDraft && (
              <div className="mb-4 p-3 sm:p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs sm:text-sm font-medium text-amber-700">Новый товар (черновик)</span>
                  </div>
                  <button
                    onClick={() => setShowAddDraft(false)}
                    className="text-amber-400 hover:text-amber-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-amber-600 mb-2 sm:mb-3">
                  Этот товар ещё не существует в Kaspi. После получения вы сможете привязать его к карточке Kaspi.
                </p>
                <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3 mb-2 sm:mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Название *</label>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="iPhone 16 Pro 256GB"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Описание</label>
                    <input
                      type="text"
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      placeholder="Новинка 2025"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Кол-во *</label>
                    <input
                      type="number"
                      value={draftQuantity}
                      onChange={(e) => setDraftQuantity(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Цена *</label>
                    <input
                      type="number"
                      value={draftPrice || ''}
                      onChange={(e) => setDraftPrice(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addDraftProduct}
                      disabled={!draftName || draftQuantity <= 0 || draftPrice <= 0}
                      className="w-full px-2 sm:px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Items List */}
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`p-2.5 sm:p-3 rounded-xl border ${item.type === 'draft' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}
                  >
                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-900 text-xs">{item.name}</span>
                            {item.type === 'draft' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                Черновик
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate">
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
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            min={1}
                            className="w-12 px-1.5 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">x</span>
                          <input
                            type="number"
                            value={item.pricePerUnit}
                            onChange={(e) => updatePrice(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 px-1.5 py-1 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">₸</span>
                        </div>
                        <span className="font-semibold text-gray-900 text-xs">{item.total.toLocaleString('ru-RU')} ₸</span>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center gap-3">
                      {/* Название товара */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                          {item.type === 'draft' && (
                            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                              Черновик
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.sku || item.draftDescription || 'Без описания'}
                        </div>
                      </div>
                      {/* Количество */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          min={1}
                          style={{ width: '60px' }}
                          className="px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-gray-500">шт</span>
                      </div>
                      {/* Цена */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          value={item.pricePerUnit}
                          onChange={(e) => updatePrice(item.id, parseInt(e.target.value) || 0)}
                          style={{ width: '100px' }}
                          className="px-2 py-1.5 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-gray-500">₸</span>
                      </div>
                      {/* Итого */}
                      <div style={{ width: '100px' }} className="text-right flex-shrink-0">
                        <span className="font-semibold text-gray-900 text-sm">{item.total.toLocaleString('ru-RU')} ₸</span>
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
              <div className="p-6 sm:p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm text-gray-500">Добавьте товары в заказ</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Выберите товары из Kaspi или добавьте новые</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Комментарий</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация о заказе..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          {/* Summary */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-600">
                Товаров: <span className="font-semibold text-gray-900">{totalItems} шт</span>
              </div>
              {hasDrafts && (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Есть черновики</span>
                  <span className="sm:hidden">Черновики</span>
                </div>
              )}
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-900">
              {totalAmount.toLocaleString('ru-RU')} ₸
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm sm:text-base font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={!canCreate}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm sm:text-base font-medium transition-colors cursor-pointer"
            >
              Создать заказ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
