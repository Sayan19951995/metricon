import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { startOfDay, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '20');

    const startDate = startOfDay(subDays(new Date(), days));

    // Get order entries for the period
    const orderEntries = await prisma.orderEntry.findMany({
      where: {
        order: {
          creationDate: {
            gte: startDate,
          },
        },
      },
      include: {
        order: true,
      },
    });

    // Calculate product statistics
    const productStats = orderEntries.reduce((acc, entry) => {
      const sku = entry.productSku;
      if (!acc[sku]) {
        acc[sku] = {
          productSku: sku,
          productName: entry.productName,
          totalSales: 0,
          totalRevenue: 0,
          totalQuantity: 0,
        };
      }
      acc[sku].totalSales += 1;
      acc[sku].totalRevenue += entry.totalPrice;
      acc[sku].totalQuantity += entry.quantity;
      return acc;
    }, {} as Record<string, any>);

    // Get product inventory levels
    const products = await prisma.product.findMany({
      select: {
        sku: true,
        availableAmount: true,
      },
    });

    const inventoryMap = products.reduce((acc, p) => {
      acc[p.sku] = p.availableAmount;
      return acc;
    }, {} as Record<string, number>);

    // Combine stats with inventory
    const analytics = Object.values(productStats).map((stat: any) => ({
      ...stat,
      averagePrice: stat.totalRevenue / stat.totalQuantity,
      stockLevel: inventoryMap[stat.productSku] || 0,
    }));

    // Sort by revenue and get top products
    analytics.sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topProducts = analytics.slice(0, limit);

    // Products with low stock
    const lowStockProducts = analytics
      .filter((p) => p.stockLevel > 0 && p.stockLevel < 10)
      .sort((a, b) => a.stockLevel - b.stockLevel)
      .slice(0, 10);

    return NextResponse.json({
      topProducts,
      lowStockProducts,
      totalProductsSold: analytics.length,
    });
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
