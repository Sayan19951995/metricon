import { NextResponse } from 'next/server';
import { getKaspiClient } from '@/lib/kaspi/client';

/**
 * Test endpoint to verify Kaspi API integration
 * GET /api/test-kaspi
 */
export async function GET(request: Request) {
  try {
    const kaspiClient = getKaspiClient();

    console.log('Testing Kaspi API connection...');
    console.log('API URL:', process.env.KASPI_API_URL);
    console.log('API Key:', process.env.KASPI_API_KEY?.substring(0, 10) + '...');

    // Test 1: Get orders
    console.log('Fetching orders...');
    const ordersResult = await kaspiClient.getOrders({
      page: 0,
      size: 10,
    });

    console.log('Orders fetched successfully:', {
      totalOrders: ordersResult.totalElements,
      ordersCount: ordersResult.orders.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Kaspi API connection successful',
      data: {
        ordersCount: ordersResult.orders.length,
        totalElements: ordersResult.totalElements,
        totalPages: ordersResult.totalPages,
        orders: ordersResult.orders.slice(0, 3), // First 3 orders for preview
      },
      apiConfig: {
        baseUrl: process.env.KASPI_API_URL,
        hasApiKey: !!process.env.KASPI_API_KEY,
      },
    });
  } catch (error: any) {
    console.error('Kaspi API test failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to connect to Kaspi API',
        error: error.message,
        details: error.response?.data || null,
        status: error.response?.status || null,
      },
      { status: 500 }
    );
  }
}
