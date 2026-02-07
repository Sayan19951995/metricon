'use client';

import { useState, useEffect } from 'react';
import { X, Search, Link2, Package, Check } from 'lucide-react';

// Mock данные товаров из Kaspi (в реальности из API)
const kaspiProducts = [
  { id: 1, name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', category: 'Смартфоны' },
  { id: 2, name: 'iPhone 14 Pro 512GB', sku: 'APL-IP14P-512', category: 'Смартфоны' },
  { id: 3, name: 'iPhone 15 Pro 256GB', sku: 'APL-IP15P-256', category: 'Смартфоны' },
  { id: 4, name: 'iPhone 15 Pro 512GB', sku: 'APL-IP15P-512', category: 'Смартфоны' },
  { id: 5, name: 'iPhone 16 Pro 256GB', sku: 'APL-IP16P-256', category: 'Смартфоны' },
  { id: 6, name: 'iPhone 16 Pro 512GB', sku: 'APL-IP16P-512', category: 'Смартфоны' },
  { id: 7, name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', category: 'Смартфоны' },
  { id: 8, name: 'Samsung Galaxy S24 Ultra', sku: 'SAM-S24U-256', category: 'Смартфоны' },
  { id: 9, name: 'AirPods Pro 2', sku: 'APL-APP2', category: 'Аксессуары' },
  { id: 10, name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', category: 'Ноутбуки' },
  { id: 11, name: 'MacBook Pro 14" M3', sku: 'APL-MBP14-M3', category: 'Ноутбуки' },
  { id: 12, name: 'Mac Mini M2', sku: 'APL-MM-M2', category: 'Компьютеры' },
  { id: 13, name: 'Mac Mini M2 Pro', sku: 'APL-MM-M2P', category: 'Компьютеры' },
  { id: 14, name: 'iPad Air 5th Gen', sku: 'APL-IPA5', category: 'Планшеты' },
  { id: 15, name: 'Apple Watch Ultra', sku: 'APL-AWU', category: 'Часы' },
];

interface DraftItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  pricePerUnit: number;
}

interface KaspiProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
}

interface LinkProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftItem: DraftItem | null;
  onLinkProduct: (draftItemId: string, kaspiProduct: KaspiProduct) => void;
}

export default function LinkProductModal({ isOpen, onClose, draftItem, onLinkProduct }: LinkProductModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<KaspiProduct | null>(null);

  // Сброс при открытии модалки
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedProduct(null);
    }
  }, [isOpen]);

  if (!isOpen || !draftItem) return null;

  // Фильтрация товаров по поиску
  const filteredProducts = kaspiProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLink = () => {
    if (selectedProduct) {
      onLinkProduct(draftItem.id, selectedProduct);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
              <Link2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Привязать к товару Kaspi</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Выберите товар из каталога Kaspi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Draft Item Info */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-100 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">{draftItem.name}</span>
                <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded text-xs font-medium">
                  Черновик
                </span>
              </div>
              {draftItem.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{draftItem.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Количество: {draftItem.quantity} шт</span>
                <span>Цена: {draftItem.pricePerUnit.toLocaleString('ru-RU')} ₸</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Товары не найдены</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Попробуйте изменить поисковый запрос</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 cursor-pointer ${
                    selectedProduct?.id === product.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{product.sku}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">|</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{product.category}</span>
                    </div>
                  </div>
                  {selectedProduct?.id === product.id && (
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedProduct ? (
                <span>
                  Выбран: <span className="font-medium text-gray-900 dark:text-white">{selectedProduct.name}</span>
                </span>
              ) : (
                <span>Выберите товар из списка</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedProduct}
                className={`px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                  selectedProduct
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Привязать
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
