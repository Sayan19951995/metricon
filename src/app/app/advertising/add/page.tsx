export default function AddAdvertisingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Добавить рекламный расход</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Дата</label>
            <input
              type="date"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Товар</label>
            <select className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
              <option>Выберите товар</option>
              <option>Общая реклама (на весь магазин)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Источник рекламы</label>
            <select className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
              <option>Kaspi</option>
              <option>Instagram</option>
              <option>Facebook</option>
              <option>Google Ads</option>
              <option>Yandex Direct</option>
              <option>TikTok</option>
              <option>Другое</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Сумма расхода (₸)</label>
            <input
              type="number"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Комментарий</label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Дополнительная информация о рекламной кампании"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Сохранить
            </button>
            <a
              href="/app/advertising"
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Отмена
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
