import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  KaspiConfig,
  KaspiOrder,
  OrdersResponse,
  KaspiProduct,
  ProductsResponse,
} from '@/types/kaspi';

export class KaspiMerchantClient {
  private client: AxiosInstance;
  private config: KaspiConfig;

  constructor(config: KaspiConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'X-Auth-Token': config.apiKey,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Kaspi API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get orders from Kaspi Merchant API
   * Endpoint: GET /shop/api/v2/orders
   * Note: creationDate filter is REQUIRED by Kaspi API
   */
  async getOrders(params?: {
    page?: number;
    size?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<OrdersResponse> {
    try {
      // Default to last 14 days if no dates provided
      // Kaspi API requires Unix timestamp in milliseconds
      // Maximum period is 14 days
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const dateFromTimestamp = params?.dateFrom
        ? new Date(params.dateFrom).getTime()
        : fourteenDaysAgo.getTime();

      const dateToTimestamp = params?.dateTo
        ? new Date(params.dateTo).getTime()
        : now.getTime();

      const queryParams: any = {
        'page[number]': params?.page || 0,
        'page[size]': params?.size || 50,
        'filter[orders][creationDate][$ge]': dateFromTimestamp,
        'filter[orders][creationDate][$le]': dateToTimestamp,
      };

      if (params?.status) {
        queryParams['filter[orders][state]'] = params.status;
      }

      const response = await this.client.get('/orders', {
        params: queryParams,
      });

      // Parse JSON API format response
      const data = response.data;

      // Debug: log first order to see structure
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        console.log('=== Kaspi API Order Structure ===');
        console.log('Full first order:', JSON.stringify(data.data[0], null, 2));
        console.log('Available attributes:', Object.keys(data.data[0].attributes || {}));
        console.log('=================================');
      }

      if (data.data && Array.isArray(data.data)) {
        const orders = data.data.map((item: any) => ({
          code: item.attributes?.code || item.id,
          orderId: item.id,
          totalPrice: item.attributes?.totalPrice || 0,
          deliveryCostForSeller: item.attributes?.deliveryCostForSeller || item.attributes?.deliveryCost || 0,
          creationDate: item.attributes?.creationDate || new Date().toISOString(),
          stateDate: item.attributes?.stateDate || item.attributes?.statusDate || item.attributes?.lastStateChangeDate,
          approveDate: item.attributes?.approveDate,
          plannedDeliveryDate: item.attributes?.delivery?.plannedDeliveryDate || item.attributes?.plannedDeliveryDate,
          actualDeliveryDate: item.attributes?.delivery?.actualDeliveryDate || item.attributes?.actualDeliveryDate,
          deliveryMode: item.attributes?.deliveryMode || '',
          deliveryAddress: item.attributes?.deliveryAddress,
          customer: item.attributes?.customer || {},
          state: item.attributes?.state || 'NEW',
          entries: item.attributes?.entries || [],
          signatureRequired: item.attributes?.signatureRequired || false,
          preOrder: item.attributes?.preOrder || false,
          kaspiDelivery: item.attributes?.kaspiDelivery ? {
            ...item.attributes.kaspiDelivery,
            assembleDate: item.attributes.delivery?.assembleDate,
            plannedPointDeliveryDate: item.attributes.delivery?.plannedPointDeliveryDate,
          } : undefined,
        }));

        return {
          orders,
          page: data.meta?.page || 0,
          size: data.meta?.size || orders.length,
          totalElements: data.meta?.totalElements || orders.length,
          totalPages: data.meta?.totalPages || 1,
        };
      }

      return {
        orders: [],
        page: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get specific order by code
   * Endpoint: GET /shop/api/v2/orders/{orderCode}
   */
  async getOrder(orderCode: string): Promise<KaspiOrder> {
    try {
      const response = await this.client.get(`/orders/${orderCode}`);
      const data = response.data;

      // Debug: log order details to see structure
      if (data.data) {
        console.log('=== Kaspi API Single Order Structure ===');
        console.log('Full order data:', JSON.stringify(data.data, null, 2));
        console.log('Available attributes:', Object.keys(data.data.attributes || {}));
        console.log('========================================');
      }

      if (data.data) {
        const item = data.data;

        // Try to load entries separately if not included
        let entries = item.attributes?.entries || [];
        if (entries.length === 0) {
          try {
            const entriesResponse = await this.getOrderEntries(item.id);
            if (entriesResponse.data && Array.isArray(entriesResponse.data)) {
              entries = entriesResponse.data.map((entry: any) => ({
                quantity: entry.attributes?.quantity || 0,
                deliveryPointOfServiceId: entry.attributes?.deliveryPointOfServiceId,
                masterProduct: entry.attributes?.masterProduct,
                product: {
                  code: entry.attributes?.offer?.code || '',
                  name: entry.attributes?.offer?.name || '',
                  sku: entry.attributes?.offer?.code || '',
                },
                totalPrice: entry.attributes?.totalPrice || 0,
                basePrice: entry.attributes?.basePrice || 0,
              }));
              console.log('Loaded entries separately:', entries);
            }
          } catch (e) {
            console.warn('Could not load entries separately:', e);
          }
        }

        return {
          code: item.attributes?.code || item.id,
          orderId: item.id,
          totalPrice: item.attributes?.totalPrice || 0,
          creationDate: item.attributes?.creationDate || new Date().toISOString(),
          stateDate: item.attributes?.stateDate || item.attributes?.statusDate || item.attributes?.lastStateChangeDate,
          deliveryMode: item.attributes?.deliveryMode || '',
          deliveryAddress: item.attributes?.deliveryAddress,
          customer: item.attributes?.customer || {},
          state: item.attributes?.state || 'NEW',
          entries: entries,
          signatureRequired: item.attributes?.signatureRequired || false,
          preOrder: item.attributes?.preOrder || false,
          kaspiDelivery: item.attributes?.kaspiDelivery,
        };
      }

      throw new Error('Order not found');
    } catch (error) {
      console.error(`Error fetching order ${orderCode}:`, error);
      throw error;
    }
  }

  /**
   * Get order entries
   * Endpoint: GET /shop/api/v2/orders/{orderId}/entries
   */
  async getOrderEntries(orderId: string) {
    try {
      const response = await this.client.get(`/orders/${orderId}/entries`);

      // Debug: log entries structure
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        console.log(`=== Entries for order ${orderId} ===`);
        console.log('First entry:', JSON.stringify(response.data.data[0], null, 2));
        if (response.data.data[0]?.attributes) {
          console.log('Entry attributes keys:', Object.keys(response.data.data[0].attributes));
        }
        console.log('===================================');
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching order entries for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Update order status (Accept order)
   * Endpoint: POST /shop/api/v2/orders
   */
  async updateOrderStatus(
    orderId: string,
    orderCode: string,
    status: string
  ): Promise<KaspiOrder> {
    try {
      const response = await this.client.post('/orders', {
        data: {
          type: 'orders',
          id: orderId,
          attributes: {
            code: orderCode,
            state: status,
          },
        },
      });

      const data = response.data;
      if (data.data) {
        const item = data.data;
        return {
          code: item.attributes?.code || item.id,
          orderId: item.id,
          totalPrice: item.attributes?.totalPrice || 0,
          creationDate: item.attributes?.creationDate || new Date().toISOString(),
          stateDate: item.attributes?.stateDate || item.attributes?.statusDate || item.attributes?.lastStateChangeDate,
          deliveryMode: item.attributes?.deliveryMode || '',
          deliveryAddress: item.attributes?.deliveryAddress,
          customer: item.attributes?.customer || {},
          state: item.attributes?.state || status,
          entries: item.attributes?.entries || [],
          signatureRequired: item.attributes?.signatureRequired || false,
          preOrder: item.attributes?.preOrder || false,
          kaspiDelivery: item.attributes?.kaspiDelivery,
        };
      }

      throw new Error('Failed to update order status');
    } catch (error) {
      console.error(`Error updating order ${orderCode}:`, error);
      throw error;
    }
  }

  /**
   * Get products (merchant products)
   * Endpoint: GET /shop/api/v2/merchant-products
   */
  async getProducts(params?: {
    page?: number;
    size?: number;
  }): Promise<any> {
    try {
      const queryParams: any = {
        'page[number]': params?.page || 0,
        'page[size]': params?.size || 100,
      };

      console.log('Fetching merchant products with params:', queryParams);
      console.log('Base URL:', this.config.apiUrl);
      console.log('Full URL:', `${this.config.apiUrl}/merchant-products`);

      const response = await this.client.get('/merchant-products', {
        params: queryParams,
      });

      console.log('Products response received:', {
        status: response.status,
        dataKeys: response.data ? Object.keys(response.data) : [],
        hasData: !!response.data?.data,
      });

      return response.data;
    } catch (error: any) {
      console.error('Error fetching products:', error);
      console.error('Request URL:', error.config?.url);
      console.error('Request params:', error.config?.params);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProduct(sku: string): Promise<KaspiProduct> {
    try {
      const response = await this.client.get<KaspiProduct>(`/products/${sku}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Update product inventory
   */
  async updateProductInventory(
    sku: string,
    availableAmount: number
  ): Promise<KaspiProduct> {
    try {
      const response = await this.client.patch<KaspiProduct>(`/products/${sku}`, {
        availableAmount,
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating product ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(dateFrom: string, dateTo: string) {
    const orders = await this.getOrders({ dateFrom, dateTo });

    const stats = {
      totalOrders: orders.totalElements,
      totalRevenue: 0,
      averageOrderValue: 0,
      newOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    };

    orders.orders.forEach((order) => {
      stats.totalRevenue += order.totalPrice;

      switch (order.state) {
        case 'NEW':
          stats.newOrders++;
          break;
        case 'COMPLETED':
          stats.completedOrders++;
          break;
        case 'CANCELLED':
          stats.cancelledOrders++;
          break;
      }
    });

    stats.averageOrderValue = stats.totalOrders > 0
      ? stats.totalRevenue / stats.totalOrders
      : 0;

    return stats;
  }
}

// Create singleton instance
let kaspiClient: KaspiMerchantClient | null = null;

export function getKaspiClient(): KaspiMerchantClient {
  if (!kaspiClient) {
    kaspiClient = new KaspiMerchantClient({
      apiUrl: process.env.KASPI_API_URL || '',
      merchantId: process.env.KASPI_MERCHANT_ID || '',
      apiKey: process.env.KASPI_API_KEY || '',
      apiSecret: process.env.KASPI_API_SECRET || '',
    });
  }
  return kaspiClient;
}
