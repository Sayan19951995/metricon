export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">О проекте</h1>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Metricon Analytics</h2>
          <p className="text-gray-700 mb-4">
            Профессиональная платформа для управления магазином на Kaspi.kz
          </p>
          <p className="text-gray-700 mb-4">
            Мы помогаем продавцам автоматизировать рутинные задачи, анализировать продажи
            и увеличивать прибыль с помощью умных инструментов.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-3">Возможности</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• Интеграция с Kaspi Merchant API</li>
              <li>• Автоматизация управления ценами</li>
              <li>• Мониторинг конкурентов</li>
              <li>• Авторассылки клиентам</li>
              <li>• Учет рекламных расходов</li>
              <li>• Управление складом</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-3">Преимущества</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• Экономия времени на рутинных задачах</li>
              <li>• Увеличение продаж через автоцену</li>
              <li>• Детальная аналитика прибыли</li>
              <li>• Контроль рекламного бюджета</li>
              <li>• Улучшение сервиса через авторассылки</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-block"
          >
            Начать использовать
          </a>
        </div>
      </div>
    </div>
  );
}
