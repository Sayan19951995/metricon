'use client';

import { useState, useEffect, useCallback } from 'react';

// Тип товара на складе
export interface WarehouseProduct {
  id: number;
  name: string;
  sku: string;
  qty: number;
  inTransit: number;
  costPrice: number;
  price: number;
  warehouse: string;
}

// Начальные данные товаров
const initialProducts: WarehouseProduct[] = [
  { id: 1, name: 'iPhone 14 Pro 256GB', sku: 'APL-IP14P-256', qty: 15, inTransit: 10, costPrice: 485000, price: 549000, warehouse: 'almaty' },
  { id: 2, name: 'Samsung Galaxy S23 Ultra', sku: 'SAM-S23U-256', qty: 8, inTransit: 0, costPrice: 420000, price: 489000, warehouse: 'almaty' },
  { id: 3, name: 'AirPods Pro 2', sku: 'APL-APP2', qty: 32, inTransit: 20, costPrice: 89000, price: 109000, warehouse: 'almaty' },
  { id: 4, name: 'MacBook Pro 14" M2', sku: 'APL-MBP14-M2', qty: 5, inTransit: 5, costPrice: 890000, price: 999000, warehouse: 'astana' },
  { id: 5, name: 'iPad Air 5th Gen', sku: 'APL-IPA5', qty: 12, inTransit: 0, costPrice: 285000, price: 339000, warehouse: 'almaty' },
  { id: 6, name: 'Apple Watch Ultra', sku: 'APL-AWU', qty: 18, inTransit: 0, costPrice: 320000, price: 389000, warehouse: 'astana' },
  { id: 7, name: 'Sony WH-1000XM5', sku: 'SNY-WH1000', qty: 25, inTransit: 15, costPrice: 145000, price: 179000, warehouse: 'karaganda' },
  { id: 8, name: 'Google Pixel 8 Pro', sku: 'GOO-PX8P', qty: 6, inTransit: 0, costPrice: 380000, price: 449000, warehouse: 'almaty' },
  { id: 9, name: 'Samsung Galaxy Tab S9', sku: 'SAM-TABS9', qty: 10, inTransit: 5, costPrice: 290000, price: 359000, warehouse: 'shymkent' },
  { id: 10, name: 'Nintendo Switch OLED', sku: 'NIN-SWOLED', qty: 14, inTransit: 0, costPrice: 165000, price: 199000, warehouse: 'almaty' },
  { id: 11, name: 'DJI Mini 3 Pro', sku: 'DJI-M3P', qty: 4, inTransit: 3, costPrice: 420000, price: 499000, warehouse: 'astana' },
  { id: 12, name: 'Bose QuietComfort 45', sku: 'BOSE-QC45', qty: 20, inTransit: 0, costPrice: 125000, price: 159000, warehouse: 'karaganda' },
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

  return {
    products,
    isLoaded,
    getProductById,
    getProductBySku,
    updateProduct,
    receiveProduct,
    addInTransit,
    resetToInitial,
    setProducts
  };
};

export default useWarehouseProducts;
