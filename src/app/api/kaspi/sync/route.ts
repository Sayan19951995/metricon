import { NextResponse } from 'next/server';
import { KaspiMerchantClient } from '@/lib/kaspi/client';

export async function POST(request: Request) {
  try {
    const { apiKey, days = 14 } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Create Kaspi client with provided API key
    const kaspiClient = new KaspiMerchantClient({
      apiUrl: 'https://kaspi.kz/shop/api/v2',
      merchantId: '',
      apiKey: apiKey,
      apiSecret: '',
    });

    // Calculate date range (max 14 days for Kaspi API)
    const now = new Date();
    const daysToFetch = Math.min(days, 14);
    const dateFrom = new Date(now.getTime() - daysToFetch * 24 * 60 * 60 * 1000);

    console.log('Fetching orders from Kaspi...');

    // Fetch orders
    const ordersResponse = await kaspiClient.getOrders({
      page: 0,
      size: 100,
      dateFrom: dateFrom.toISOString(),
      dateTo: now.toISOString(),
    });

    console.log(`Fetched ${ordersResponse.orders.length} orders`);

    // Load entries for each order if empty and collect products
    const productsMap = new Map();
    const ordersWithEntries = await Promise.all(
      ordersResponse.orders.map(async (order) => {
        if (!order.entries || order.entries.length === 0) {
          try {
            console.log(`Loading entries for order ${order.code}...`);
            const entriesResponse = await kaspiClient.getOrderEntries(order.orderId);

            if (entriesResponse.data && Array.isArray(entriesResponse.data)) {
              order.entries = entriesResponse.data.map((entry: any) => {
                // Extract product information
                const productCode = entry.attributes?.offer?.code || '';
                const productName = entry.attributes?.offer?.name || '';
                const basePrice = entry.attributes?.basePrice || 0;
                const categoryId = entry.attributes?.category?.code || '';

                // Add to products map if not already there
                if (productCode && !productsMap.has(productCode)) {
                  productsMap.set(productCode, {
                    sku: productCode,
                    kaspiId: productCode,
                    name: productName,
                    price: basePrice,
                    availableAmount: 0, // Will be updated separately
                    categoryId: categoryId,
                    images: [],
                    attributes: {
                      category: entry.attributes?.category,
                      masterProduct: entry.attributes?.masterProduct,
                    },
                  });
                }

                return {
                  quantity: entry.attributes?.quantity || 0,
                  deliveryPointOfServiceId: entry.attributes?.deliveryPointOfServiceId,
                  masterProduct: entry.attributes?.masterProduct,
                  product: {
                    code: productCode,
                    name: productName,
                    sku: productCode,
                  },
                  totalPrice: entry.attributes?.totalPrice || 0,
                  basePrice: basePrice,
                };
              });
              console.log(`Loaded ${order.entries.length} entries for order ${order.code}`);
            }
          } catch (e) {
            console.warn(`Could not load entries for order ${order.code}:`, e);
          }
        }
        return order;
      })
    );

    // Extract products (no DB save)
    const products = Array.from(productsMap.values());
    console.log(`Found ${products.length} unique products`);

    // Calculate statistics
    const totalRevenue = ordersWithEntries.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );

    const ordersByState = ordersWithEntries.reduce((acc, order) => {
      acc[order.state] = (acc[order.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEntries = ordersWithEntries.reduce(
      (sum, order) => sum + (order.entries?.length || 0),
      0
    );

    return NextResponse.json({
      success: true,
      message: 'Data loaded successfully',
      data: {
        syncedOrders: ordersWithEntries.length,
        syncedEntries: totalEntries,
        syncedProducts: products.length,
        totalOrders: ordersResponse.totalElements,
        totalRevenue,
        ordersByState,
        orders: ordersWithEntries,
        products: products,
        period: {
          from: dateFrom.toISOString(),
          to: now.toISOString(),
          days: daysToFetch,
        },
      },
    });
  } catch (error: any) {
    console.error('Error loading data:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load data',
        details: error.response?.data,
      },
      { status: 500 }
    );
  }
}
