interface TopProductsProps {
  products: Array<{
    productSku: string;
    productName: string;
    totalSales: number;
    totalRevenue: number;
    totalQuantity: number;
    averagePrice: number;
  }>;
}

export function TopProducts({ products }: TopProductsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Топ товаров</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Товар
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Продано
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Выручка
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ср. цена
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.productSku}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {product.productName}
                  </div>
                  <div className="text-sm text-gray-500">{product.productSku}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.totalQuantity}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.totalRevenue.toLocaleString('ru-RU')} ₸
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.averagePrice.toLocaleString('ru-RU')} ₸
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
