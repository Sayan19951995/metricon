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

    console.log('Fetching products from Kaspi...');

    // Fetch products
    const productsResponse = await kaspiClient.getProducts({
      page: 0,
      size: 100,
    });

    console.log(`Fetched products:`, productsResponse);

    return NextResponse.json({
      success: true,
      data: productsResponse,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch products',
        details: error.response?.data,
        status: error.response?.status,
      },
      { status: 500 }
    );
  }
}
