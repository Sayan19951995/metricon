'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, MessageSquare, ShoppingBag, X, Search, Minus, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface StoreProduct {
  kaspi_id: string;
  name: string;
  price: number | null;
  cost_price: number | null;
}

interface OrderItem {
  id: string; // kaspi_id or generated
  name: string;
  price: number;
  quantity: number;
  isCustom?: boolean;
}

export default function AddOrderPage() {
  const router = useRouter();
  const { user, store, loading: userLoading } = useUser();
  const [source, setSource] = useState('cash');
  const [date, setDate] = useState('');
  const [comment, setComment] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Product picker
  const [showPicker, setShowPicker] = useState(false);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Custom product form
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Load store products
  useEffect(() => {
    if (!user) return;
    const params = store ? `storeId=${store.id}` : `userId=${user.id}`;
    setProductsLoading(true);
    fetch(`/api/products?${params}`)
      .then(r => r.json())
      .then(d => { if (d.success) setStoreProducts(d.data || []); })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, [user, store]);

  // Focus search when picker opens
  useEffect(() => {
    if (showPicker && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [showPicker]);

  const addStoreProduct = (p: StoreProduct) => {
    const existing = items.find(i => i.id === p.kaspi_id);
    if (existing) {
      setItems(items.map(i => i.id === p.kaspi_id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { id: p.kaspi_id, name: p.name, price: p.price || 0, quantity: 1 }]);
    }
    setShowPicker(false);
    setSearch('');
  };

  const addCustomProduct = () => {
    if (!customName.trim() || !customPrice) return;
    const id = `custom_${Date.now()}`;
    setItems([...items, { id, name: customName.trim(), price: Number(customPrice), quantity: 1, isCustom: true }]);
    setCustomName('');
    setCustomPrice('');
    setShowCustom(false);
    setShowPicker(false);
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const newQty = i.quantity + delta;
      return newQty > 0 ? { ...i, quantity: newQty } : i;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const filteredProducts = storeProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !user) return;

    setSaving(true);
    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storeId: store?.id,
          source,
          date: date || new Date().toISOString(),
          comment,
          items: items.map(i => ({
            product_code: i.id,
            product_name: i.name,
            price: i.price,
            quantity: i.quantity,
            total: i.price * i.quantity,
          })),
          totalAmount: total,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/app/orders');
      } else {
        alert(data.message || 'Ошибка создания заказа');
      }
    } catch {
      alert('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Назад к заказам</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Добавить заказ вручную</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Создайте новый заказ с пользовательскими данными</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        {/* Source */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            Источник продажи
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="cash">Наличные</option>
            <option value="card">Перевод на карту</option>
            <option value="kaspi">Kaspi перевод</option>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
            <option value="other">Другое</option>
          </select>
        </div>

        {/* Products */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
            <Plus className="w-5 h-5 text-emerald-600" />
            Товары
          </label>

          {/* Selected items */}
          {items.length > 0 && (
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{fmt(item.price)} ₸ / шт.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white w-24 text-right">
                    {fmt(item.price * item.quantity)} ₸
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Итого:</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(total)} ₸</span>
              </div>
            </div>
          )}

          {/* Add product button */}
          <button
            type="button"
            onClick={() => { setShowPicker(true); setShowCustom(false); }}
            className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-4 py-8 text-gray-500 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20 transition-all group cursor-pointer"
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-emerald-600" />
              <span className="font-medium text-sm">Добавить товар</span>
            </div>
          </button>
        </div>

        {/* Date */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Дата продажи
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Comment */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Комментарий
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            rows={3}
            placeholder="Дополнительная информация о заказе"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={items.length === 0 || saving}
            className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Создать заказ
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            Отмена
          </button>
        </div>
      </form>

      {/* Product Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowPicker(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Добавить товар</h3>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs: Из каталога / Новый товар */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  !showCustom ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Из каталога
              </button>
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  showCustom ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Новый товар
              </button>
            </div>

            {!showCustom ? (
              <>
                {/* Search */}
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Поиск товара..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Product list */}
                <div className="flex-1 overflow-y-auto px-3 pb-3">
                  {productsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      {search ? 'Ничего не найдено' : 'Нет товаров в каталоге'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredProducts.map(p => {
                        const alreadyAdded = items.some(i => i.id === p.kaspi_id);
                        return (
                          <button
                            key={p.kaspi_id}
                            type="button"
                            onClick={() => addStoreProduct(p)}
                            className={`w-full text-left px-3 py-3 rounded-xl transition-colors ${
                              alreadyAdded
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {p.price ? `${fmt(p.price)} ₸` : 'Цена не указана'}
                              {alreadyAdded && <span className="text-emerald-600 ml-2">Добавлен</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Custom product form */
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Название товара</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Введите название"
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Цена (₸)</label>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={addCustomProduct}
                  disabled={!customName.trim() || !customPrice}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Добавить
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
