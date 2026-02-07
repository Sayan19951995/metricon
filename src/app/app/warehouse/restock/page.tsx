export default function RestockPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Пополнение остатков</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Товар</label>
            <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Выберите товар</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Количество</label>
              <input
                type="number"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Себестоимость (₸)</label>
              <input
                type="number"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Дата поступления</label>
            <input
              type="date"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Комментарий</label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Дополнительная информация"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Сохранить
            </button>
            <a
              href="/app/warehouse"
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
