// Kaspi Merchant API Types

export interface KaspiConfig {
  apiUrl: string;
  merchantId: string;
  apiKey: string;
  apiSecret: string;
}

export interface KaspiOrder {
  code: string;
  orderId: string;
  totalPrice: number;
  deliveryCostForSeller?: number;
  creationDate: string;
  stateDate?: string;
  approveDate?: string;
  plannedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryMode: string;
  deliveryAddress?: {
    address?: string;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
  };
  customer: {
    firstName: string;
    lastName: string;
    cellPhone: string;
  };
  state: OrderState;
  entries: OrderEntry[];
  signatureRequired: boolean;
  preOrder: boolean;
  kaspiDelivery?: {
    waybillNumber?: string;
    courierTransmissionDate?: string;
    waybill?: string;
    assembleDate?: string;
    plannedPointDeliveryDate?: string;
  };
}

export interface OrderEntry {
  quantity: number;
  deliveryPointOfServiceId?: string;
  masterProduct?: {
    code: string;
  };
  product: {
    code: string;
    name: string;
    sku: string;
  };
  totalPrice: number;
  basePrice: number;
}

export type OrderState =
  | 'NEW'
  | 'ACCEPTED'
  | 'APPROVED_BY_BANK'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CANCELLING'
  | 'KASPI_DELIVERY_RETURN_REQUESTED'
  | 'RETURNED'
  | 'ARCHIVE';

export interface KaspiProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  availableAmount: number;
  categoryId: string;
  images?: string[];
  attributes?: Record<string, string>;
}

export interface OrdersResponse {
  orders: KaspiOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductsResponse {
  products: KaspiProduct[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface OrderStatistics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  newOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface ProductAnalytics {
  productId: string;
  productName: string;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  stockLevel: number;
}

export interface FinancialMetrics {
  totalRevenue: number;
  totalOrders: number;
  commission: number;
  netProfit: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface CompetitorData {
  productName: string;
  price: number;
  merchantName: string;
  rating?: number;
  reviewsCount?: number;
  url: string;
  scrapedAt: Date;
}
