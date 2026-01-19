import { NextResponse } from 'next/server';
import { getKaspiClient } from '@/lib/kaspi/client';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const size = parseInt(searchParams.get('size') || '50');
    const status = searchParams.get('status') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const kaspiClient = getKaspiClient();

    const response = await kaspiClient.getOrders({
      page,
      size,
      status,
      dateFrom,
      dateTo,
    });

    // Sync orders to database
    for (const order of response.orders) {
      await prisma.order.upsert({
        where: { kaspiOrderCode: order.code },
        update: {
          state: order.state,
          totalPrice: order.totalPrice,
          syncedAt: new Date(),
        },
        create: {
          kaspiOrderCode: order.code,
          kaspiOrderId: order.orderId,
          totalPrice: order.totalPrice,
          creationDate: new Date(order.creationDate),
          deliveryMode: order.deliveryMode,
          customerName: `${order.customer.firstName} ${order.customer.lastName}`,
          customerPhone: order.customer.cellPhone,
          state: order.state,
          signatureRequired: order.signatureRequired,
          preOrder: order.preOrder,
          kaspiDelivery: !!order.kaspiDelivery,
          entries: {
            create: order.entries.map((entry) => ({
              quantity: entry.quantity,
              productCode: entry.product.code,
              productName: entry.product.name,
              productSku: entry.product.sku,
              totalPrice: entry.totalPrice,
              basePrice: entry.basePrice,
            })),
          },
        },
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
