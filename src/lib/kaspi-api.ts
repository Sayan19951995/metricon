// Kaspi Merchant API Client
// Документация: https://kaspi.kz/shop/api/v2/

import { KaspiOrder, KaspiProduct, OrdersResponse, OrderState } from '@/types/kaspi';

const KASPI_API_URL = 'https://kaspi.kz/shop/api/v2';

interface KaspiApiConfig {
  apiKey: string;
  merchantId: string;
}

export class KaspiApiClient {
  private apiKey: string;
  private merchantId: string;

  constructor(config: KaspiApiConfig) {
    this.apiKey = config.apiKey;
    this.merchantId = config.merchantId;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${KASPI_API_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'X-Auth-Token': this.apiKey,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kaspi API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Raw fetch - возвращает сырой JSON ответ без обработки
  async fetchRaw(endpoint: string): Promise<any> {
    return this.fetch<any>(endpoint);
  }

  // Проверка подключения - получаем последние заказы
  async testConnection(): Promise<{ success: boolean; message: string; ordersCount?: number }> {
    try {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      const response = await this.fetch<any>(
        `/orders?page[number]=0&page[size]=1&filter[orders][creationDate][$ge]=${dayAgo}&filter[orders][creationDate][$le]=${now}`
      );

      return {
        success: true,
        message: 'Подключение успешно',
        ordersCount: response.data?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  // Получить заказы
  async getOrders(params: {
    page?: number;
    size?: number;
    state?: OrderState;
    dateFrom?: number;
    dateTo?: number;
  } = {}): Promise<{ orders: KaspiOrder[]; totalPages: number; totalElements: number }> {
    const { page = 0, size = 20, state, dateFrom, dateTo } = params;

    let url = `/orders?page[number]=${page}&page[size]=${size}`;

    if (state) {
      url += `&filter[orders][state]=${state}`;
    }

    if (dateFrom) {
      url += `&filter[orders][creationDate][$ge]=${dateFrom}`;
    }

    if (dateTo) {
      url += `&filter[orders][creationDate][$le]=${dateTo}`;
    }

    const response = await this.fetch<any>(url);

    // Преобразуем ответ Kaspi API в наш формат (без entries - они загружаются отдельно)
    const orders: KaspiOrder[] = (response.data || []).map((item: any) => ({
      code: item.id,
      orderId: item.attributes?.code || item.id,
      totalPrice: item.attributes?.totalPrice || 0,
      deliveryCostForSeller: item.attributes?.deliveryCostForSeller,
      creationDate: item.attributes?.creationDate,
      stateDate: item.attributes?.stateDate,
      approveDate: item.attributes?.approvedByBankDate,
      plannedDeliveryDate: item.attributes?.plannedDeliveryDate,
      deliveryMode: item.attributes?.deliveryMode || 'DELIVERY',
      deliveryAddress: item.attributes?.deliveryAddress ? {
        address: item.attributes.deliveryAddress.streetName,
        formattedAddress: item.attributes.deliveryAddress.formattedAddress,
        latitude: item.attributes.deliveryAddress.latitude,
        longitude: item.attributes.deliveryAddress.longitude,
      } : undefined,
      customer: {
        firstName: item.attributes?.customer?.firstName || '',
        lastName: item.attributes?.customer?.lastName || '',
        cellPhone: item.attributes?.customer?.cellPhone || '',
      },
      state: item.attributes?.state || 'NEW',
      status: item.attributes?.status || item.attributes?.state || 'NEW',
      entries: [], // Загружаются отдельно через getOrderEntries
      signatureRequired: item.attributes?.signatureRequired || false,
      preOrder: item.attributes?.preOrder || false,
      kaspiDelivery: item.attributes?.kaspiDelivery,
    }));

    return {
      orders,
      totalPages: response.meta?.pageCount || 1,
      totalElements: response.meta?.totalCount || orders.length,
    };
  }

  // Получить entries (товары) заказа - отдельный запрос по документации Kaspi API
  // Kaspi API возвращает товар в entry.attributes.offer (не product!)
  async getOrderEntries(orderId: string): Promise<any[]> {
    try {
      const response = await this.fetch<any>(`/orders/${orderId}/entries`);

      return (response.data || []).map((entry: any) => ({
        quantity: entry.attributes?.quantity || 1,
        deliveryPointOfServiceId: entry.relationships?.deliveryPointOfService?.data?.id,
        product: {
          code: entry.relationships?.product?.data?.id || entry.attributes?.offer?.code || '',
          name: entry.attributes?.offer?.name || '',
          sku: entry.attributes?.offer?.code || '',
        },
        category: entry.attributes?.category?.title || '',
        totalPrice: entry.attributes?.totalPrice || 0,
        basePrice: entry.attributes?.basePrice || 0,
      }));
    } catch (err) {
      console.error(`Failed to get entries for order ${orderId}:`, err);
      return [];
    }
  }

  // Получить ВСЕ заказы с пагинацией
  async getAllOrders(params: {
    state?: OrderState;
    dateFrom?: number;
    dateTo?: number;
    pageSize?: number;
  } = {}): Promise<{ orders: KaspiOrder[]; totalElements: number }> {
    const { pageSize = 100, ...rest } = params;
    let allOrders: KaspiOrder[] = [];
    let page = 0;
    let totalPages = 1;

    while (page < totalPages) {
      const result = await this.getOrders({ ...rest, page, size: pageSize });
      allOrders = allOrders.concat(result.orders);
      totalPages = result.totalPages;
      page++;
    }

    return { orders: allOrders, totalElements: allOrders.length };
  }

  // Получить детали заказа
  async getOrderDetails(orderId: string): Promise<KaspiOrder | null> {
    try {
      const response = await this.fetch<any>(`/orders/${orderId}`);
      const item = response.data;

      if (!item) return null;

      return {
        code: item.id,
        orderId: item.attributes?.code || item.id,
        totalPrice: item.attributes?.totalPrice || 0,
        deliveryCostForSeller: item.attributes?.deliveryCostForSeller,
        creationDate: item.attributes?.creationDate,
        stateDate: item.attributes?.stateDate,
        approveDate: item.attributes?.approvedByBankDate,
        plannedDeliveryDate: item.attributes?.plannedDeliveryDate,
        deliveryMode: item.attributes?.deliveryMode || 'DELIVERY',
        deliveryAddress: item.attributes?.deliveryAddress ? {
          address: item.attributes.deliveryAddress.streetName,
          formattedAddress: item.attributes.deliveryAddress.formattedAddress,
          latitude: item.attributes.deliveryAddress.latitude,
          longitude: item.attributes.deliveryAddress.longitude,
        } : undefined,
        customer: {
          firstName: item.attributes?.customer?.firstName || '',
          lastName: item.attributes?.customer?.lastName || '',
          cellPhone: item.attributes?.customer?.cellPhone || '',
        },
        state: item.attributes?.state || 'NEW',
        entries: await this.getOrderEntries(item.id),
        signatureRequired: item.attributes?.signatureRequired || false,
        preOrder: item.attributes?.preOrder || false,
        kaspiDelivery: item.attributes?.kaspiDelivery,
      };
    } catch {
      return null;
    }
  }

  // Обновить статус заказа
  async updateOrderStatus(orderId: string, newState: 'ACCEPTED' | 'CANCELLED' | 'COMPLETED', reason?: string): Promise<boolean> {
    try {
      const body: any = {
        data: {
          type: 'orders',
          id: orderId,
          attributes: {
            state: newState,
          },
        },
      };

      if (newState === 'CANCELLED' && reason) {
        body.data.attributes.cancellationReason = reason;
      }

      await this.fetch(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      return true;
    } catch {
      return false;
    }
  }

  // Получить товары (через заказы, т.к. отдельного endpoint нет)
  async getProductsFromOrders(daysBack: number = 30): Promise<KaspiProduct[]> {
    const dateTo = Date.now();
    const dateFrom = dateTo - daysBack * 24 * 60 * 60 * 1000;

    const { orders } = await this.getAllOrders({ dateFrom, dateTo });

    const productsMap = new Map<string, KaspiProduct>();

    for (const order of orders) {
      for (const entry of order.entries) {
        if (!productsMap.has(entry.product.code)) {
          productsMap.set(entry.product.code, {
            id: entry.product.code,
            sku: entry.product.sku,
            name: entry.product.name,
            price: entry.basePrice,
            availableAmount: 0, // Kaspi API не возвращает остатки через orders
            categoryId: '',
          });
        }
      }
    }

    return Array.from(productsMap.values());
  }

  // Статистика заказов
  async getOrdersStatistics(dateFrom: number, dateTo: number): Promise<{
    totalOrders: number;
    totalRevenue: number;
    newOrders: number;
    completedOrders: number;
    cancelledOrders: number;
  }> {
    const { orders } = await this.getAllOrders({ dateFrom, dateTo });

    let totalRevenue = 0;
    let newOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;

    for (const order of orders) {
      totalRevenue += order.totalPrice;

      switch (order.state) {
        case 'NEW':
          newOrders++;
          break;
        case 'COMPLETED':
          completedOrders++;
          break;
        case 'CANCELLED':
        case 'RETURNED':
          cancelledOrders++;
          break;
      }
    }

    return {
      totalOrders: orders.length,
      totalRevenue,
      newOrders,
      completedOrders,
      cancelledOrders,
    };
  }
}

// Создать клиент из данных магазина
export function createKaspiClient(apiKey: string, merchantId: string): KaspiApiClient {
  return new KaspiApiClient({ apiKey, merchantId });
}
