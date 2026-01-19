export default function EditAutoPricingPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Редактировать правило #{params.id}</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Товар</label>
            <select className="w-full border border-gray-300 rounded-lg px-4 py-2">
              <option>Выберите товар</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Минимальная цена (₸)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Не опускаться ниже"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Размер демпинга (₸)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="На сколько снижать цену"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm">Автоматически обновлять цену</span>
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
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Отмена
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
