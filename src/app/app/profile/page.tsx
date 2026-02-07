export default function ProfilePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Профиль пользователя</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Имя</label>
            <input
              type="text"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Ваше имя"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Телефон</label>
            <input
              type="tel"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="+7 (___) ___-__-__"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Сменить пароль</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Текущий пароль</label>
                <input
                  type="password"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Новый пароль</label>
                <input
                  type="password"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
