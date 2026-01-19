import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { startOfDay, endOfDay, subDays, eachDayOfInterval, format } from 'date-fns';

const KASPI_COMMISSION_RATE = 0.05; // 5% commission rate (adjust as needed)

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
        state: {
          in: ['COMPLETED', 'ACCEPTED', 'APPROVED_BY_BANK'],
        },
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalCommission = totalRevenue * KASPI_COMMISSION_RATE;
    const netProfit = totalRevenue - totalCommission;

    // Calculate daily financial metrics
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyMetrics = daysInterval.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayOrders = orders.filter(
        (order) =>
          order.creationDate >= dayStart && order.creationDate <= dayEnd
      );

      const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalPrice, 0);
      const dayCommission = dayRevenue * KASPI_COMMISSION_RATE;
      const dayProfit = dayRevenue - dayCommission;

      return {
        date: format(day, 'yyyy-MM-dd'),
        revenue: dayRevenue,
        orders: dayOrders.length,
        commission: dayCommission,
        netProfit: dayProfit,
      };
    });

    // Calculate monthly comparison
    const previousPeriodStart = subDays(startDate, days);
    const previousOrders = await prisma.order.findMany({
      where: {
        creationDate: {
          gte: previousPeriodStart,
          lt: startDate,
        },
        state: {
          in: ['COMPLETED', 'ACCEPTED', 'APPROVED_BY_BANK'],
        },
      },
    });

    const previousRevenue = previousOrders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );

    const revenueGrowth =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        commission: totalCommission,
        netProfit,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        revenueGrowth: revenueGrowth.toFixed(2),
      },
      dailyMetrics,
    });
  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
