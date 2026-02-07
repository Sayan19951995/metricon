'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface CompetitorPrice {
  merchantId: string;
  merchantName: string;
  price: number;
  rating: number;
  reviewsCount: number;
  isCurrentMerchant: boolean;
}

interface MonitorResult {
  productName: string;
  productUrl: string;
  prices: CompetitorPrice[];
  lowestPrice: number;
  yourPrice?: number;
  yourPosition?: number;
}

export default function PriceMonitorPage() {
  const router = useRouter();
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MonitorResult | null>(null);

  const handleMonitor = async () => {
    if (!productUrl.trim()) {
      setError('Введите ссылку на товар Kaspi.kz');
      return;
    }

    // Validate URL
    if (!productUrl.includes('kaspi.kz')) {
      setError('Ссылка должна быть с kaspi.kz');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('Monitoring prices for:', productUrl);
      const response = await fetch('/api/kaspi/monitor-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productUrl: productUrl.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        // Show error with instruction if provided
        const errorMessage = data.instruction
          ? `${data.error}\n\n${data.instruction}`
          : (data.error || 'Не удалось загрузить цены конкурентов');
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('Error monitoring prices:', err);
      setError('Ошибка при загрузке цен конкурентов');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f14635] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка цен конкурентов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Мониторинг цен конкурентов</h1>
              <p className="text-gray-600 dark:text-gray-400">Отслеживайте цены конкурентов на Kaspi.kz</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 backdrop-blur-lg bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all shadow-lg border border-white/20 dark:border-gray-700/20"
            >
              ← Назад
            </button>
          </div>

          {/* URL Input */}
          <div className="backdrop-blur-lg bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Введите ссылку на товар
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Скопируйте ссылку на товар с Kaspi.kz и вставьте ее сюда для мониторинга цен всех продавцов
            </p>

            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://kaspi.kz/shop/p/..."
                  className="w-full px-4 py-3 backdrop-blur-lg bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white rounded-xl border border-white/20 dark:border-gray-700/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#f14635] placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleMonitor();
                    }
                  }}
                />
                {error && (
                  <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-900 dark:text-red-200 font-semibold mb-2">Ошибка</p>
                    <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-line">{error}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleMonitor}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-[#f14635] to-[#ff6b5a] text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50"
              >
                {loading ? 'Загрузка...' : '🔍 Проверить цены'}
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-2">💡 Как это работает:</p>
              <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside space-y-1">
                <li>Откройте товар на Kaspi.kz в браузере</li>
                <li>Скопируйте ссылку из адресной строки (например: https://kaspi.kz/shop/p/...)</li>
                <li>Вставьте ссылку в поле выше</li>
                <li>Нажмите "Проверить цены"</li>
              </ul>
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-900 dark:text-yellow-200 font-semibold mb-1">⚠️ Если не получается автоматически:</p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  Kaspi может блокировать автоматические запросы. В этом случае:
                </p>
                <ol className="text-xs text-yellow-800 dark:text-yellow-300 list-decimal list-inside mt-1 space-y-0.5">
                  <li>Откройте страницу товара в браузере</li>
                  <li>Нажмите Ctrl+S (или Cmd+S на Mac)</li>
                  <li>Сохраните как "kaspi-product-XXXXX.html" в папку docs</li>
                  <li>Попробуйте снова - система найдет сохраненный файл</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="backdrop-blur-lg bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{result.productName}</h2>
              <a
                href={result.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {result.productUrl}
              </a>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-1">Минимальная цена</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {result.lowestPrice.toLocaleString('ru-RU')} ₸
                  </p>
                </div>

                {result.yourPrice && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Ваша цена</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {result.yourPrice.toLocaleString('ru-RU')} ₸
                    </p>
                  </div>
                )}

                {result.yourPosition && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">Ваша позиция</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                      #{result.yourPosition} из {result.prices.length}
                    </p>
                  </div>
                )}

                {!result.yourPrice && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-600/30 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Всего продавцов</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {result.prices.length}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Competitors Table */}
            <div className="backdrop-blur-lg bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Цены всех продавцов ({result.prices.length})
                </h3>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="divide-y divide-gray-200 dark:divide-gray-700"
              >
                {result.prices.map((competitor, index) => (
                  <motion.div
                    key={competitor.merchantId}
                    variants={itemVariants}
                    className={`p-6 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all ${
                      competitor.isCurrentMerchant ? 'bg-blue-50/50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${
                          index === 0 ? 'text-green-600' :
                          index === 1 ? 'text-blue-600' :
                          index === 2 ? 'text-orange-600' :
                          'text-gray-400'
                        }`}>
                          #{index + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {competitor.merchantName}
                            </h4>
                            {competitor.isCurrentMerchant && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-full">
                                Ваш магазин
                              </span>
                            )}
                            {index === 0 && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs font-semibold rounded-full">
                                🏆 Лучшая цена
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{competitor.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {competitor.reviewsCount} отзывов
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          {competitor.price.toLocaleString('ru-RU')} ₸
                        </div>
                        {result.lowestPrice < competitor.price && (
                          <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                            +{(competitor.price - result.lowestPrice).toLocaleString('ru-RU')} ₸
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Action Suggestions */}
            {result.yourPrice && result.lowestPrice < result.yourPrice && (
              <div className="backdrop-blur-lg bg-orange-50/60 dark:bg-orange-900/30 border border-orange-200/20 dark:border-orange-700/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-2">Рекомендация по цене</h3>
                    <p className="text-orange-800 dark:text-orange-300 mb-3">
                      Ваша цена выше минимальной на {(result.yourPrice - result.lowestPrice).toLocaleString('ru-RU')} ₸.
                      Рекомендуемая цена для конкурентоспособности:
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 inline-block">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Рекомендуемая цена</p>
                      <p className="text-2xl font-bold text-[#f14635]">
                        {(result.lowestPrice - 1).toLocaleString('ru-RU')} ₸
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        (минимальная цена - 1 ₸)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result.yourPrice && result.yourPrice === result.lowestPrice && (
              <div className="backdrop-blur-lg bg-green-50/60 dark:bg-green-900/30 border border-green-200/20 dark:border-green-700/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">🏆 Отличная работа!</h3>
                    <p className="text-green-800 dark:text-green-300">
                      У вас лучшая цена на рынке! Ваш товар находится на первой позиции.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!result && !loading && !error && (
          <div className="backdrop-blur-lg bg-white/60 dark:bg-gray-800/60 rounded-2xl p-12 text-center shadow-xl border border-white/20 dark:border-gray-700/20">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Начните мониторинг цен
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Введите ссылку на товар Kaspi.kz выше для проверки цен конкурентов
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
