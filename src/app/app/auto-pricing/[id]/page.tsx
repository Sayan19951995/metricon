export default function EditAutoPricingPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Редактировать правило #{params.id}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Товар</label>
            <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Выберите товар</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Минимальная цена (₸)</label>
              <input
                type="number"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Не опускаться ниже"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Размер демпинга (₸)</label>
              <input
                type="number"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="На сколько снижать цену"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm text-gray-900 dark:text-white">Автоматически обновлять цену</span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Сохранить
            </button>
            <button
              type="button"
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Удалить правило
            </button>
            <a
              href="/app/auto-pricing"
              className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Отмена
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
