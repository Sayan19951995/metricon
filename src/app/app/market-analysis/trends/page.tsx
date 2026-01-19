export default function TrendsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Тренды рынка</h1>
        <a
          href="/app/market-analysis"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          ← Назад
        </a>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500 py-8">
          Анализ трендов пока недоступен
        </div>
      </div>
    </div>
  );
}
