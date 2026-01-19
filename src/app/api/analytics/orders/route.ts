import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const orders = await prisma.order.findMany({
      where: {
        creationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        entries: true,
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.state] = (acc[order.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily statistics
    const dailyStats = orders.reduce((acc, order) => {
      const date = startOfDay(order.creationDate).toISOString();
      if (!acc[date]) {
        acc[date] = { date, orders: 0, revenue: 0 };
      }
      acc[date].orders += 1;
      acc[date].revenue += order.totalPrice;
      return acc;
    }, {} as Record<string, { date: string; orders: number; revenue: number }>);

    return NextResponse.json({
      summary: {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        ordersByStatus,
      },
      dailyStats: Object.values(dailyStats).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
