'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface Product {
  sku: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  image?: string;
}

interface PriceModalProduct extends Product {
  lowestPrice?: number;
  discount?: number;
}

export default function KaspiLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true); // Начинаем с true для проверки сессии
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openMenuSku, setOpenMenuSku] = useState<string | null>(null);
  const [priceModalProduct, setPriceModalProduct] = useState<PriceModalProduct | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [newStock, setNewStock] = useState<string>('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');

  // Восстановление сессии при загрузке страницы
  useEffect(() => {
    const restoreSession = async () => {
      const savedSessionId = localStorage.getItem('kaspi_session_id');
      const savedUsername = localStorage.getItem('kaspi_username');
      const savedProducts = localStorage.getItem('kaspi_products');

      if (savedSessionId && savedUsername) {
        console.log('Восстанавливаем сессию...', savedSessionId);
        setSessionId(savedSessionId);
        setUsername(savedUsername);
        setIsLoggedIn(true);

        // Восстанавливаем товары из localStorage
        if (savedProducts) {
          try {
            const parsedProducts = JSON.parse(savedProducts);
            setProducts(parsedProducts);
          } catch (err) {
            console.error('Ошибка парсинга товаров:', err);
          }
        }

        // Проверяем валидность сессии и загружаем свежие данные
        try {
          await loadProducts(savedSessionId);
        } catch (err) {
          console.error('Ошибка загрузки товаров при восстановлении:', err);
          // Если не удалось - оставляем старые данные из localStorage
        }
      }

      setLoading(false);
    };

    restoreSession();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Введите логин и пароль');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Logging in to Kaspi...');
      const response = await fetch('/api/kaspi/automation/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          headless: false, // Показывать браузер для отладки
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setIsLoggedIn(true);

        // Сохранить в localStorage
        localStorage.setItem('kaspi_session_id', data.sessionId);
        localStorage.setItem('kaspi_username', username.trim());

        // Загрузить товары
        await loadProducts(data.sessionId);
      } else {
        setError(data.error || 'Не удалось войти в Kaspi кабинет');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Ошибка при входе в систему');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (sid: string) => {
    try {
      console.log('Loading products...');
      const response = await fetch('/api/kaspi/automation/get-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sid,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
        localStorage.setItem('kaspi_products', JSON.stringify(data.products || []));
      } else {
        setError(data.error || 'Не удалось загрузить товары');
      }
    } catch (err: any) {
      console.error('Load products error:', err);
      setError('Ошибка при загрузке товаров');
    }
  };

  const handleLogout = async () => {
    if (sessionId) {
      try {
        await fetch('/api/kaspi/automation/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
          }),
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }

    // Clear state
    setSessionId('');
    setProducts([]);
    setIsLoggedIn(false);
    localStorage.removeItem('kaspi_session_id');
    localStorage.removeItem('kaspi_username');
    localStorage.removeItem('kaspi_products');
  };

  const openPriceModal = async (product: Product) => {
    setPriceLoading(true);
    setPriceError('');

    try {
      // Загружаем детали товара и самую низкую цену
      const response = await fetch('/api/kaspi/automation/get-product-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          sku: product.sku,
          name: product.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPriceModalProduct({
          ...product,
          lowestPrice: data.lowestPrice,
          discount: data.discount,
        });
        setNewPrice(product.price.toString());
        setNewStock(product.stock.toString());
      } else {
        setPriceModalProduct(product);
        setNewPrice(product.price.toString());
        setNewStock(product.stock.toString());
      }
    } catch (err) {
      console.error('Error loading product details:', err);
      setPriceModalProduct(product);
      setNewPrice(product.price.toString());
      setNewStock(product.stock.toString());
    } finally {
      setPriceLoading(false);
    }
  };

  const closePriceModal = () => {
    setPriceModalProduct(null);
    setNewPrice('');
    setNewStock('');
    setPriceError('');
  };

  const handleUpdatePrice = async () => {
    if (!priceModalProduct) return;

    const price = parseFloat(newPrice);
    const stock = parseInt(newStock);

    if (isNaN(price) || price <= 0) {
      setPriceError('Введите корректную цену');
      return;
    }

    if (isNaN(stock) || stock < 0) {
      setPriceError('Введите корректный остаток');
      return;
    }

    setPriceLoading(true);
    setPriceError('');

    try {
      const response = await fetch('/api/kaspi/automation/update-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          sku: priceModalProduct.sku,
          name: priceModalProduct.name,
          price,
          stock,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Обновляем товар в списке
        setProducts(prevProducts =>
          prevProducts.map(p =>
            p.sku === priceModalProduct.sku
              ? { ...p, price, stock }
              : p
          )
        );
        closePriceModal();
      } else {
        setPriceError(data.error || 'Не удалось обновить цену');
      }
    } catch (err: any) {
      console.error('Update price error:', err);
      setPriceError('Ошибка при обновлении цены');
    } finally {
      setPriceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f14635] mx-auto mb-4"></div>
          <p className="text-gray-600">Вход в Kaspi кабинет...</p>
          <p className="text-sm text-gray-500 mt-2">Браузер откроется автоматически</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {isLoggedIn ? 'Мои товары на Kaspi' : 'Вход в Kaspi кабинет'}
              </h1>
              <p className="text-gray-600">
                {isLoggedIn
                  ? `Вы вошли как ${localStorage.getItem('kaspi_username')}`
                  : 'Войдите через браузер для доступа к товарам'
                }
              </p>
            </div>
            <div className="flex gap-3">
              {isLoggedIn && (
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 backdrop-blur-lg bg-red-500/80 text-white rounded-xl hover:bg-red-600/80 transition-all shadow-lg cursor-pointer"
                >
                  🚪 Выйти
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 backdrop-blur-lg bg-white/60 text-gray-900 rounded-xl hover:bg-white/80 transition-all shadow-lg border border-white/20 cursor-pointer"
              >
                ← Назад
              </button>
            </div>
          </div>
        </motion.div>

        {/* Login Form */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-lg bg-white/60 rounded-2xl shadow-xl border border-white/20 p-8 max-w-md mx-auto"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Введите данные от Kaspi кабинета
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Логин (телефон или email)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="+7 (777) 123-45-67"
                  className="w-full px-4 py-3 backdrop-blur-lg bg-white/60 rounded-xl border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#f14635]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      document.getElementById('password-input')?.focus();
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль
                </label>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  className="w-full px-4 py-3 backdrop-blur-lg bg-white/60 rounded-xl border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#f14635]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900 font-semibold mb-1">Ошибка</p>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full px-8 py-4 bg-gradient-to-r from-[#f14635] to-[#ff6b5a] text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 text-lg cursor-pointer"
              >
                {loading ? 'Входим...' : '🔐 Войти в Kaspi'}
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 font-semibold mb-2">💡 Как это работает:</p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>Введите логин и пароль от Kaspi Merchant Cabinet</li>
                <li>Система откроет браузер и войдет автоматически</li>
                <li>Загрузятся все ваши товары с актуальными данными</li>
                <li>Сессия сохранится для быстрого доступа</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-900 font-semibold mb-1">🔒 Безопасность</p>
              <p className="text-xs text-yellow-800">
                Ваши данные используются только для входа в браузер и не сохраняются на сервере.
                Все операции выполняются локально на вашем компьютере.
              </p>
            </div>
          </motion.div>
        )}

        {/* Products List */}
        {isLoggedIn && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="backdrop-blur-lg bg-white/60 rounded-xl shadow-lg border border-white/20 p-4">
                <p className="text-sm text-gray-600">Всего товаров</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{products.length}</p>
              </div>
              <div className="backdrop-blur-lg bg-white/60 rounded-xl shadow-lg border border-white/20 p-4">
                <p className="text-sm text-gray-600">В наличии</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {products.filter(p => p.stock > 0).length}
                </p>
              </div>
              <div className="backdrop-blur-lg bg-white/60 rounded-xl shadow-lg border border-white/20 p-4">
                <p className="text-sm text-gray-600">Нет в наличии</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {products.filter(p => p.stock === 0).length}
                </p>
              </div>
              <div className="backdrop-blur-lg bg-white/60 rounded-xl shadow-lg border border-white/20 p-4">
                <p className="text-sm text-gray-600">Средняя цена</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length).toLocaleString('ru-RU')} ₸
                </p>
              </div>
            </div>

            {/* Products Table */}
            <div className="backdrop-blur-lg bg-white/60 rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  Список товаров ({products.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Название
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Цена
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Остаток
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Категория
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.sku} className="hover:bg-white/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">{product.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {product.price.toLocaleString('ru-RU')} ₸
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            product.stock > 10 ? 'bg-green-100 text-green-800' :
                            product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.stock} шт
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm relative">
                          <button
                            onClick={() => setOpenMenuSku(openMenuSku === product.sku ? null : product.sku)}
                            className="text-gray-600 hover:text-gray-900 font-bold text-xl cursor-pointer"
                          >
                            ⋮
                          </button>

                          {openMenuSku === product.sku && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuSku(null)}
                              />
                              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setOpenMenuSku(null);
                                      openPriceModal(product);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                                  >
                                    <span>💰</span>
                                    Изменить цену
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {isLoggedIn && products.length === 0 && (
          <div className="backdrop-blur-lg bg-white/60 rounded-2xl p-12 text-center shadow-xl border border-white/20">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Товары не найдены
            </h3>
            <p className="text-gray-600">
              Не удалось загрузить товары из вашего кабинета
            </p>
            <button
              onClick={() => loadProducts(sessionId)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Price Modal */}
        {priceModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#f14635] to-[#ff6b5a] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Цена и остаток</h3>
                  <button
                    onClick={closePriceModal}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Product Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Товар</p>
                  <p className="font-semibold text-gray-900">{priceModalProduct.name}</p>
                  <p className="text-sm text-gray-500 mt-1">SKU: {priceModalProduct.sku}</p>
                </div>

                {/* Current Price & Lowest Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-600 mb-1">Текущая цена</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {priceModalProduct.price.toLocaleString('ru-RU')} ₸
                    </p>
                  </div>
                  {priceModalProduct.lowestPrice && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm text-green-600 mb-1">Самая низкая цена</p>
                      <p className="text-2xl font-bold text-green-900">
                        {priceModalProduct.lowestPrice.toLocaleString('ru-RU')} ₸
                      </p>
                      {priceModalProduct.discount && (
                        <p className="text-xs text-green-600 mt-1">
                          -{priceModalProduct.discount}%
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Price Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Цена, ₸
                  </label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="149000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f14635] text-lg font-semibold"
                  />
                  {priceModalProduct.lowestPrice && (
                    <p className="text-xs text-gray-500 mt-1">
                      Самая низкая цена {priceModalProduct.lowestPrice.toLocaleString('ru-RU')} ₸
                    </p>
                  )}
                </div>

                {/* Stock Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Остатки от 0 до 10000 шт.
                  </label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    placeholder="2"
                    min="0"
                    max="10000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f14635] text-lg font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Товар останется в продаже, если не указать остатки. Снять с продажи его нужно будет вручную
                  </p>
                </div>

                {/* Location Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Остатки от 0 до 10000 шт.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">PP7, улица Адилова, 3A</span>
                    <span className="text-sm text-gray-600">2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">PP1, улица Полины Осипенко, 35A</span>
                    <span className="text-sm text-gray-600">8</span>
                  </div>
                </div>

                {/* Error */}
                {priceError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-900 font-semibold mb-1">Ошибка</p>
                    <p className="text-sm text-red-800">{priceError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleUpdatePrice}
                    disabled={priceLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#f14635] to-[#ff6b5a] text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {priceLoading ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                  <button
                    onClick={closePriceModal}
                    disabled={priceLoading}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
