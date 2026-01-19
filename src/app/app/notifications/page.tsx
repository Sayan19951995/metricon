export default function NotificationsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Уведомления</h1>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer">
          Отметить все как прочитанные
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            У вас нет новых уведомлений
          </div>
        </div>
      </div>
    </div>
  );
}
