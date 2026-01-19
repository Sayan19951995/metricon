export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Тарифы</h1>
          <p className="text-xl text-gray-600">
            Выберите подходящий план для вашего бизнеса
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Базовый */}
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            <h3 className="text-2xl font-bold mb-2">Базовый</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">Бесплатно</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>До 100 товаров</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Базовая аналитика</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Интеграция с Kaspi</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-300 mr-2">✗</span>
                <span className="text-gray-400">Автоцена</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-300 mr-2">✗</span>
                <span className="text-gray-400">Авторассылки</span>
              </li>
            </ul>
            <button className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition cursor-pointer">
              Текущий план
            </button>
          </div>

          {/* Профессиональный */}
          <div className="bg-blue-600 text-white rounded-lg shadow-xl p-8 transform scale-105 border-4 border-blue-500">
            <div className="absolute top-0 right-0 bg-yellow-400 text-blue-900 px-4 py-1 rounded-bl-lg font-semibold">
              Популярный
            </div>
            <h3 className="text-2xl font-bold mb-2">Профессиональный</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">19,990 ₸</span>
              <span className="text-blue-200">/месяц</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-300 mr-2">✓</span>
                <span>Неограниченно товаров</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-300 mr-2">✓</span>
                <span>Полная аналитика</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-300 mr-2">✓</span>
                <span>Автоцена (демпинг)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-300 mr-2">✓</span>
                <span>Авторассылки WhatsApp</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-300 mr-2">✓</span>
                <span>Анализ конкурентов</span>
              </li>
            </ul>
            <button className="w-full py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-semibold cursor-pointer">
              Выбрать план
            </button>
          </div>

          {/* Бизнес */}
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            <h3 className="text-2xl font-bold mb-2">Бизнес</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">39,990 ₸</span>
              <span className="text-gray-600">/месяц</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Всё из Профессионального</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Приоритетная поддержка</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>API доступ</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Индивидуальные отчеты</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Персональный менеджер</span>
              </li>
            </ul>
            <button className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer">
              Связаться с нами
            </button>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p>Все тарифы включают 14 дней бесплатного пробного периода</p>
        </div>
      </div>
    </div>
  );
}
