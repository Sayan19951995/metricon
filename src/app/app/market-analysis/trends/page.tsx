export default function TrendsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Тренды рынка</h1>
        <a
          href="/app/market-analysis"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Назад
        </a>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Анализ трендов пока недоступен
        </div>
      </div>
    </div>
  );
}
