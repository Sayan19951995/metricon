'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedData = localStorage.getItem('kaspi_orders_data');
    if (savedData) {
      const data = JSON.parse(savedData);
      const foundOrder = data.orders.find((o: any) => o.code === params.code);
      setOrder(foundOrder);
    }
    setLoading(false);
  }, [params.code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Заказ не найден</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад к списку заказов
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Заказ #{order.code}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Создан: {new Date(order.creationDate).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Статус заказа</h2>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full ${
                  order.state === 'ARCHIVE'
                    ? 'bg-gray-100 text-gray-800'
                    : order.state === 'KASPI_DELIVERY'
                    ? 'bg-blue-100 text-blue-800'
                    : order.state === 'DELIVERY'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.state}
                </span>
                {order.preOrder && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                    Предзаказ
                  </span>
                )}
                {order.signatureRequired && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                    Требуется подпись
                  </span>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Информация о клиенте</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Имя</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {order.customer.firstName} {order.customer.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Телефон</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{order.customer.cellPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Доставка</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Способ доставки</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {order.deliveryMode === 'DELIVERY_LOCAL' ? 'Местная доставка' :
                     order.deliveryMode === 'DELIVERY_REGIONAL_TODOOR' ? 'Региональная доставка' :
                     order.deliveryMode === 'PICKUP' ? 'Самовывоз' : order.deliveryMode}
                  </p>
                </div>
                {order.deliveryAddress && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Адрес доставки</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.deliveryAddress.formattedAddress}
                      </p>
                    </div>
                    {order.deliveryAddress.latitude && order.deliveryAddress.longitude && (
                      <div className="flex gap-3 mt-2">
                        <a
                          href={`https://www.google.com/maps?q=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Google Maps
                        </a>
                        <a
                          href={`https://2gis.kz/geo/${order.deliveryAddress.longitude},${order.deliveryAddress.latitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          2GIS
                        </a>
                      </div>
                    )}
                  </>
                )}
                {order.kaspiDelivery && order.kaspiDelivery.waybillNumber && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Kaspi Delivery</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-blue-800 dark:text-blue-300">
                        Накладная: <span className="font-semibold">{order.kaspiDelivery.waybillNumber}</span>
                      </p>
                      {order.kaspiDelivery.courierTransmissionDate && (
                        <p className="text-blue-800 dark:text-blue-300">
                          Дата передачи курьеру: {new Date(order.kaspiDelivery.courierTransmissionDate).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                      {order.kaspiDelivery.waybill && (
                        <a
                          href={order.kaspiDelivery.waybill}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-blue-600 hover:text-blue-700 underline mt-2"
                        >
                          Скачать накладную
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Entries/Products */}
            {order.entries && order.entries.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Товары в заказе ({order.entries.length})
                </h2>
                <div className="space-y-4">
                  {order.entries.map((entry: any, index: number) => (
                    <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {entry.product?.name || 'Товар'}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {entry.product?.sku && (
                              <p>
                                <span className="font-medium">SKU:</span> {entry.product.sku}
                              </p>
                            )}
                            {entry.product?.code && (
                              <p>
                                <span className="font-medium">Код:</span> {entry.product.code}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Количество</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{entry.quantity} шт.</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Цена за шт.</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {entry.basePrice?.toLocaleString('ru-RU')} ₸
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Сумма</p>
                          <p className="font-semibold text-blue-600">
                            {entry.totalPrice?.toLocaleString('ru-RU')} ₸
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Финансы</h2>
              <div className="space-y-3">
                <div className="flex justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Сумма заказа:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {order.totalPrice.toLocaleString('ru-RU')} ₸
                  </span>
                </div>
                {order.deliveryCostForSeller && order.deliveryCostForSeller > 0 && (
                  <div className="flex justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Стоимость доставки:</span>
                    <span className="font-semibold text-red-600">
                      - {order.deliveryCostForSeller.toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2">
                  <span className="text-gray-900 dark:text-white font-semibold">Итого к получению:</span>
                  <span className="font-bold text-green-600 text-2xl">
                    {((order.totalPrice || 0) - (order.deliveryCostForSeller || 0)).toLocaleString('ru-RU')} ₸
                  </span>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Детали заказа</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ID заказа:</span>
                  <span className="font-mono text-gray-900 dark:text-white">{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Номер:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{order.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Дата создания:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(order.creationDate).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {order.stateDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Дата изменения статуса:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(order.stateDate).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                {order.approveDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Дата подтверждения:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(order.approveDate).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                {order.plannedDeliveryDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Планируемая доставка:</span>
                    <span className="text-blue-600 font-semibold">
                      {new Date(order.plannedDeliveryDate).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                {order.actualDeliveryDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Фактическая доставка:</span>
                    <span className="text-green-600 font-semibold">
                      {new Date(order.actualDeliveryDate).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                {order.kaspiDelivery?.assembleDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Дата сборки:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(order.kaspiDelivery.assembleDate).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                {order.kaspiDelivery?.plannedPointDeliveryDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">План. доставка в пункт:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(order.kaspiDelivery.plannedPointDeliveryDate).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Count */}
            {order.entries && order.entries.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <span className="font-semibold">{order.entries.length}</span> товар(ов) в заказе
                </p>
              </div>
            )}

            {/* RAW Data Debug Block */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl p-6 border-2 border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Полные данные из API
                </h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(order, null, 2));
                    alert('Данные скопированы в буфер обмена!');
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-all flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Копировать JSON
                </button>
              </div>
              <div className="bg-black/50 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-green-400 font-mono leading-relaxed">
                  {JSON.stringify(order, null, 2)}
                </pre>
              </div>
              <div className="mt-4 text-xs text-gray-400">
                <p>💡 Этот блок показывает все данные которые мы получили из Kaspi API для этого заказа.</p>
                <p className="mt-1">Используйте эту информацию чтобы узнать какие поля доступны в API.</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Дополнительно</h2>
              <div className="space-y-2 text-sm">
                {order.deliveryMode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Тип доставки:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {order.deliveryMode === 'DELIVERY_LOCAL' ? 'Местная доставка' :
                       order.deliveryMode === 'DELIVERY_REGIONAL_TODOOR' ? 'Региональная доставка' :
                       order.deliveryMode === 'PICKUP' ? 'Самовывоз' : order.deliveryMode}
                    </span>
                  </div>
                )}
                {order.signatureRequired && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Требуется подпись:</span>
                    <span className="text-green-600 font-semibold">Да</span>
                  </div>
                )}
                {order.preOrder && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Предзаказ:</span>
                    <span className="text-purple-600 font-semibold">Да</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
