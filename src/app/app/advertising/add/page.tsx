export default function AddAdvertisingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Добавить рекламный расход</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Дата</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Товар</label>
            <select className="w-full border border-gray-300 rounded-lg px-4 py-2">
              <option>Выберите товар</option>
              <option>Общая реклама (на весь магазин)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Источник рекламы</label>
            <select className="w-full border border-gray-300 rounded-lg px-4 py-2">
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
            <label className="block text-sm font-medium mb-2">Сумма расхода (₸)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Комментарий</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
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
