export default function AdvertisingPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Реклама</h1>
          <p className="text-gray-600 mt-1">Учет рекламных расходов и аналитика</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/app/advertising/kaspi-marketing"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Kaspi Marketing
          </a>
          <a
            href="/app/advertising/analytics"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Аналитика
          </a>
          <a
            href="/app/advertising/add"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Добавить расход
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            Рекламных расходов пока нет
          </div>
        </div>
      </div>
    </div>
  );
}
