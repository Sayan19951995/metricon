'use client';

import { useState } from 'react';

interface Competitor {
  id: string;
  productName: string;
  price: number;
  merchantName: string;
  rating?: number;
  reviewsCount?: number;
  productUrl: string;
}

export function CompetitorPrices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: searchTerm,
          limit: 10,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCompetitors(data.competitors);
      }
    } catch (error) {
      console.error('Error fetching competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Анализ конкурентов</h3>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Введите название товара..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Поиск...' : 'Найти'}
        </button>
      </div>

      {competitors.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Товар
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Продавец
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цена
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Рейтинг
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitors.map((competitor) => (
                <tr key={competitor.id}>
                  <td className="px-4 py-4">
                    <a
                      href={competitor.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {competitor.productName}
                    </a>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {competitor.merchantName}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {competitor.price.toLocaleString('ru-RU')} ₸
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {competitor.rating ? (
                      <span>
                        {competitor.rating} ({competitor.reviewsCount} отзывов)
                      </span>
                    ) : (
                      <span className="text-gray-400">Нет оценок</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {competitors.length === 0 && !loading && (
        <p className="text-center text-gray-500 py-8">
          Введите название товара для поиска цен конкурентов
        </p>
      )}
    </div>
  );
}
