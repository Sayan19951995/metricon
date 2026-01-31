'use client';

import { useState, useEffect, useCallback } from 'react';

// Тип товара на складе
export interface WarehouseProduct {
  id: number;
  name: string;
  sku: string;
  qty: number;           // Остаток на складе (stock)
  inTransit: number;     // В пути
  costPrice: number;     // Себестоимость (закуп)
  price: number;         // Цена продажи
  warehouse: string;
  // Дополнительные поля для страницы товаров
  weight?: number | null;         // Вес (кг)
  category?: string;              // Категория
  status?: 'active' | 'archived'; // Статус
  image?: string;                 // Иконка/эмодзи
  preorder?: number | null;       // Дни предзаказа
  // Синхронизация с Kaspi
  kaspiStock?: number;            // Остаток по данным Kaspi API (только чтение)
  lastKaspiFetch?: string;        // Когда последний раз получали данные с Kaspi API
  lastKaspiSync?: string;         // Когда последний раз отправляли изменения в кабинет Kaspi
}

// Начальные данные товаров
// kaspiStock показывает что видит Kaspi API, qty - наш локальный остаток
// Разница = qty - kaspiStock (положительная = у нас больше, отрицательная = в Kaspi больше)
const initialProducts: WarehouseProduct[] = [
  { id: 1, name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', qty: 15, kaspiStock: 17, inTransit: 10, costPrice: 485000, price: 549000, warehouse: 'almaty', weight: 0.24, category: 'Смартфоны', status: 'active', image: '📱', preorder: null },
  { id: 2, name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', qty: 8, kaspiStock: 5, inTransit: 0, costPrice: 420000, price: 489000, warehouse: 'almaty', weight: 0.23, category: 'Смартфоны', status: 'active', image: '📱', preorder: null },
  { id: 3, name: 'AirPods Pro 2', sku: 'APL-APP2', qty: 32, kaspiStock: 32, inTransit: 20, costPrice: 89000, price: 109000, warehouse: 'almaty', weight: 0.05, category: 'Аксессуары', status: 'active', image: '🎧', preorder: null },
  { id: 4, name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', qty: 5, kaspiStock: 5, inTransit: 5, costPrice: 890000, price: 999000, warehouse: 'astana', weight: 1.6, category: 'Ноутбуки', status: 'active', image: '💻', preorder: 3 },
  { id: 5, name: 'iPad Air 5th Gen', sku: 'APL-IPA5', qty: 12, kaspiStock: 12, inTransit: 0, costPrice: 285000, price: 339000, warehouse: 'almaty', weight: 0.46, category: 'Планшеты', status: 'active', image: '📱', preorder: null },
  { id: 6, name: 'Apple Watch Ultra', sku: 'APL-AWU', qty: 18, kaspiStock: 20, inTransit: 0, costPrice: 320000, price: 389000, warehouse: 'astana', weight: 0.06, category: 'Часы', status: 'active', image: '⌚', preorder: 2 },
  { id: 7, name: 'Sony WH-1000XM5', sku: 'SNY-WH1000', qty: 25, kaspiStock: 25, inTransit: 15, costPrice: 145000, price: 179000, warehouse: 'karaganda', weight: 0.25, category: 'Аксессуары', status: 'active', image: '🎧', preorder: null },
  { id: 8, name: 'Google Pixel 8 Pro', sku: 'GOO-PX8P', qty: 6, kaspiStock: 6, inTransit: 0, costPrice: 380000, price: 449000, warehouse: 'almaty', weight: 0.21, category: 'Смартфоны', status: 'active', image: '📱', preorder: null },
  { id: 9, name: 'Samsung Galaxy Tab S9', sku: 'SAM-TABS9', qty: 10, kaspiStock: 10, inTransit: 5, costPrice: 290000, price: 359000, warehouse: 'shymkent', weight: 0.5, category: 'Планшеты', status: 'active', image: '📱', preorder: null },
  { id: 10, name: 'Nintendo Switch OLED', sku: 'NIN-SWOLED', qty: 14, kaspiStock: 14, inTransit: 0, costPrice: 165000, price: 199000, warehouse: 'almaty', weight: 0.42, category: 'Аксессуары', status: 'active', image: '🎮', preorder: null },
  { id: 11, name: 'DJI Mini 3 Pro', sku: 'DJI-M3P', qty: 4, kaspiStock: 4, inTransit: 3, costPrice: 420000, price: 499000, warehouse: 'astana', weight: 0.25, category: 'Аксессуары', status: 'active', image: '🚁', preorder: null },
  { id: 12, name: 'Bose QuietComfort 45', sku: 'BOSE-QC45', qty: 20, kaspiStock: 20, inTransit: 0, costPrice: 125000, price: 159000, warehouse: 'karaganda', weight: 0.24, category: 'Аксессуары', status: 'active', image: '🎧', preorder: null },
];

const STORAGE_KEY = 'metricon_warehouse_products';

/**
 * Расчёт новой средневзвешенной себестоимости
 * @param currentQty - Текущий остаток на складе
 * @param currentCostPrice - Текущая себестоимость единицы
 * @param newQty - Количество нового поступления
 * @param newPurchasePrice - Закупочная цена за единицу (в тенге)
 * @param newDeliveryCost - Логистика и таможня за весь товар (в тенге)
 */
export const calculateWeightedAverageCost = (
  currentQty: number,
  currentCostPrice: number,
  newQty: number,
  newPurchasePrice: number,
  newDeliveryCost: number
): number => {
  // Себестоимость единицы нового товара = закупка + (логистика / количество)
  const newCostPerUnit = newPurchasePrice + (newDeliveryCost / newQty);

  // Общая стоимость текущего запаса
  const totalOldValue = currentQty * currentCostPrice;

  // Общая стоимость нового поступления
  const totalNewValue = newQty * newCostPerUnit;

  // Новая средневзвешенная себестоимость
  const totalQty = currentQty + newQty;

  if (totalQty === 0) return 0;

  return Math.round((totalOldValue + totalNewValue) / totalQty);
};

/**
 * Хук для управления товарами склада с персистентностью в localStorage
 */
export const useWarehouseProducts = () => {
  const [products, setProducts] = useState<WarehouseProduct[]>(initialProducts);
  const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка из localStorage при монтировании
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProducts(parsed);
        } catch (e) {
          console.error('Failed to parse warehouse products from localStorage', e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Сохранение в localStorage при изменении
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  }, [products, isLoaded]);

  // Получить товар по ID
  const getProductById = useCallback((id: number): WarehouseProduct | undefined => {
    return products.find(p => p.id === id);
  }, [products]);

  // Получить товар по SKU
  const getProductBySku = useCallback((sku: string): WarehouseProduct | undefined => {
    return products.find(p => p.sku === sku);
  }, [products]);

  // Обновить товар
  const updateProduct = useCallback((id: number, updates: Partial<WarehouseProduct>) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  // Приёмка товара с пересчётом себестоимости
  const receiveProduct = useCallback((
    productId: number,
    quantity: number,
    purchasePrice: number,  // Закупочная цена за единицу (в тенге)
    deliveryCost: number    // Логистика за весь товар (в тенге)
  ) => {
    setProducts(prev => prev.map(product => {
      if (product.id !== productId) return product;

      const newCostPrice = calculateWeightedAverageCost(
        product.qty,
        product.costPrice,
        quantity,
        purchasePrice,
        deliveryCost
      );

      return {
        ...product,
        qty: product.qty + quantity,
        inTransit: Math.max(0, product.inTransit - quantity),
        costPrice: newCostPrice
      };
    }));
  }, []);

  // Добавить товар в "в пути"
  const addInTransit = useCallback((productId: number, quantity: number) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, inTransit: p.inTransit + quantity } : p
    ));
  }, []);

  // Сбросить к начальным данным
  const resetToInitial = useCallback(() => {
    setProducts(initialProducts);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Оффлайн продажа - уменьшаем остаток (Kaspi остаток не меняется, появляется расхождение)
  const offlineSale = useCallback((productId: number, quantity: number) => {
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, qty: Math.max(0, p.qty - quantity) }
        : p
    ));
  }, []);

  // Получить разницу между локальным остатком и Kaspi
  // Положительное = у нас больше, отрицательное = в Kaspi больше
  const getStockDiff = useCallback((product: WarehouseProduct): number | null => {
    if (product.kaspiStock === undefined) return null;
    return product.qty - product.kaspiStock;
  }, []);

  // Получить товары с расхождениями
  const getProductsWithDiff = useCallback(() => {
    return products.filter(p => {
      if (p.kaspiStock === undefined) return false;
      return p.qty !== p.kaspiStock;
    });
  }, [products]);

  // Получить остатки с Kaspi API (только чтение, можно часто вызывать)
  const fetchKaspiStock = useCallback(async (productId?: number): Promise<boolean> => {
    // TODO: Реальный API вызов к Kaspi
    // const kaspiData = await kaspiApi.getStock(product.sku);

    // Имитация запроса к API
    await new Promise(resolve => setTimeout(resolve, 800));

    const now = new Date().toISOString();

    if (productId) {
      // Обновить один товар
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, lastKaspiFetch: now }
          : p
      ));
    } else {
      // Обновить все товары
      setProducts(prev => prev.map(p => ({
        ...p,
        lastKaspiFetch: now
      })));
    }

    return true;
  }, []);

  // Синхронизировать с Kaspi кабинетом (ЗАПИСЬ - отправить наш остаток в Kaspi)
  // После успешной синхронизации kaspiStock = qty
  const syncWithKaspi = useCallback(async (productId: number): Promise<boolean> => {
    // TODO: Реальный API вызов к Kaspi кабинету
    // await kaspiCabinet.updateStock(product.sku, product.qty, product.warehouse);

    // Имитация запроса к кабинету (медленнее чем API)
    await new Promise(resolve => setTimeout(resolve, 1500));

    setProducts(prev => prev.map(p =>
      p.id === productId
        ? {
            ...p,
            kaspiStock: p.qty, // После синхронизации Kaspi видит наш остаток
            lastKaspiSync: new Date().toISOString()
          }
        : p
    ));

    return true;
  }, []);

  // Массовая синхронизация всех товаров с расхождениями
  const syncAllWithKaspi = useCallback(async (): Promise<number> => {
    const productsWithDiff = products.filter(p =>
      p.kaspiStock !== undefined && p.qty !== p.kaspiStock
    );

    let synced = 0;
    for (const product of productsWithDiff) {
      await syncWithKaspi(product.id);
      synced++;
    }

    return synced;
  }, [products, syncWithKaspi]);

  return {
    products,
    isLoaded,
    getProductById,
    getProductBySku,
    updateProduct,
    receiveProduct,
    addInTransit,
    resetToInitial,
    setProducts,
    // Kaspi синхронизация
    offlineSale,
    getStockDiff,
    getProductsWithDiff,
    fetchKaspiStock,
    syncWithKaspi,
    syncAllWithKaspi
  };
};

export default useWarehouseProducts;
