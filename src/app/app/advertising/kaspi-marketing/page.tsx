export default function KaspiMarketingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Подключение Kaspi Marketing</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Автоматическая загрузка рекламных данных</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Подключите свой аккаунт Kaspi Marketing для автоматической синхронизации рекламных расходов
          </p>
        </div>

        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Логин (телефон/email)</label>
            <input
              type="text"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="+7 (___) ___-__-__"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Пароль</label>
            <input
              type="password"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Примечание:</strong> Ваши данные используются только для загрузки статистики.
              Мы не храним пароли и используем безопасное соединение.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Подключить
            </button>
            <a
              href="/app/advertising"
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Отмена
            </a>
          </div>
        </form>

        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Состояние подключения</h3>
          <p className="text-gray-500 dark:text-gray-400">Не подключено</p>
        </div>
      </div>
    </div>
  );
}
