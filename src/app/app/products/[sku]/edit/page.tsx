export default function EditProductPage({ params }: { params: { sku: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Редактировать товар {params.sku}</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Цена продажи</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Количество на складе</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="0"
            />
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
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
