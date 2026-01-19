export default function ProfilePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Профиль пользователя</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Имя</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="Ваше имя"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Телефон</label>
            <input
              type="tel"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="+7 (___) ___-__-__"
            />
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3">Сменить пароль</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Текущий пароль</label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Новый пароль</label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
