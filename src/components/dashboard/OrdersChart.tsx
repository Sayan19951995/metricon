'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OrdersChartProps {
  data: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export function OrdersChart({ data }: OrdersChartProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Динамика заказов</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (!value) return ['0', name || ''];
              if (name === 'revenue') {
                return [value.toLocaleString('ru-RU') + ' ₸', 'Выручка'];
              }
              return [value, 'Заказы'];
            }}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3b82f6" name="Заказы" />
          <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" name="Выручка (₸)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
