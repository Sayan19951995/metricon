// Скрипт для генерации mock данных с октября 2025 по январь 2026

const startDate = new Date('2025-10-01');
const endDate = new Date('2026-01-19');

const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const result = [];

let currentDate = new Date(startDate);

while (currentDate <= endDate) {
  const dayOfWeek = days[currentDate.getDay()];
  const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

  // Генерируем случайные, но реалистичные данные
  // Выходные дни - меньше заказов, будни - больше
  const baseOrders = isWeekend ? Math.floor(Math.random() * 4) + 3 : Math.floor(Math.random() * 6) + 5;
  const revenue = baseOrders * (Math.floor(Math.random() * 5000) + 12000);
  const cost = Math.floor(revenue * (0.55 + Math.random() * 0.1)); // 55-65% себестоимость
  const advertising = Math.floor(revenue * (0.03 + Math.random() * 0.03)); // 3-6% реклама
  const commissions = Math.floor(revenue * 0.08); // 8% комиссия
  const tax = Math.floor(revenue * 0.04); // 4% налог
  const delivery = Math.floor(revenue * 0.015); // 1.5% доставка
  const profit = revenue - cost - advertising - commissions - tax - delivery;

  const dateStr = `${String(currentDate.getDate()).padStart(2, '0')}.${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const fullDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  result.push(`    { date: '${dateStr}', fullDate: new Date('${fullDateStr}'), day: '${dayOfWeek}', orders: ${baseOrders}, revenue: ${revenue}, cost: ${cost}, advertising: ${advertising}, commissions: ${commissions}, tax: ${tax}, delivery: ${delivery}, profit: ${profit} },`);

  currentDate.setDate(currentDate.getDate() + 1);
}

console.log('dailyData: [');
result.forEach(line => console.log(line));
console.log('],');
