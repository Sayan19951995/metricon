import { NextResponse } from 'next/server';
import { KaspiMerchantClient } from '@/lib/kaspi/client';

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    const kaspiClient = new KaspiMerchantClient({
      apiUrl: 'https://kaspi.kz/shop/api/v2',
      merchantId: '',
      apiKey: apiKey,
      apiSecret: '',
    });

    console.log('Fetching orders to extract products...');

    // Fetch orders from the last 14 days
    const ordersResponse = await kaspiClient.getOrders({
      page: 0,
      size: 100,
    });

    console.log(`Fetched ${ordersResponse.orders.length} orders`);

    // Extract unique products from order entries
    const productsMap = new Map();

    for (const order of ordersResponse.orders) {
      // Fetch entries for each order to get product details
      try {
        const entriesResponse = await kaspiClient.getOrderEntries(order.orderId);

        if (entriesResponse.data && Array.isArray(entriesResponse.data)) {
          for (const entry of entriesResponse.data) {
            const attributes = entry.attributes;
            if (attributes && attributes.offer) {
              const productCode = attributes.offer.code;
              if (productCode && !productsMap.has(productCode)) {
                productsMap.set(productCode, {
                  id: productCode,
                  sku: productCode,
                  name: attributes.offer.name || 'Товар',
                  price: attributes.basePrice || attributes.totalPrice || 0,
                  availableAmount: 0, // Not available from orders
                  categoryId: attributes.category?.code || '',
                  categoryName: attributes.category?.title || '',
                  images: [],
                });
              }
            }
          }
        }
      } catch (entryError) {
        console.log(`Could not fetch entries for order ${order.orderId}:`, entryError);
        // Continue with next order
      }
    }

    const products = Array.from(productsMap.values());

    console.log(`Extracted ${products.length} unique products from orders`);

    return NextResponse.json({
      success: true,
      products: products,
      note: 'Товары извлечены из заказов за последние 14 дней. Kaspi API не предоставляет прямой эндпоинт для получения полного списка товаров.',
    });
  } catch (error: any) {
    console.error('Error fetching products from orders:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch products from orders',
        details: error.response?.data,
        status: error.response?.status,
        note: 'API Kaspi не предоставляет эндпоинт для получения списка товаров. Товары можно извлечь только из заказов.',
      },
      { status: 500 }
    );
  }
}
