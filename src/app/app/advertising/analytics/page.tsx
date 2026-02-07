export default function AdvertisingAnalyticsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Аналитика рекламы</h1>
        <a
          href="/app/advertising"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Назад
        </a>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-2">Общие расходы</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">0 ₸</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-2">ROI</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">0%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-2">ROAS</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Расходы по источникам</h2>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Данных для аналитики пока нет
        </div>
      </div>
    </div>
  );
}
