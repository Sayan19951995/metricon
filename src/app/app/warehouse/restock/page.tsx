export default function RestockPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Пополнение остатков</h1>

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
              <label className="block text-sm font-medium mb-2">Количество</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Себестоимость (₸)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Дата поступления</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Комментарий</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              rows={3}
              placeholder="Дополнительная информация"
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
              href="/app/warehouse"
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
