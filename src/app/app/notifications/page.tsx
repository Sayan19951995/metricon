export default function NotificationsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Уведомления</h1>
        <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer">
          Отметить все как прочитанные
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            У вас нет новых уведомлений
          </div>
        </div>
      </div>
    </div>
  );
}
