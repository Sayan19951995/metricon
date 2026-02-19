import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    // Check admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!(adminUser as any)?.is_admin) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    // Parallel queries for stats
    const [usersResult, subsResult, storesResult] = await Promise.all([
      supabase.from('users').select('id, created_at', { count: 'exact' }),
      supabase.from('subscriptions').select('id, plan, status, start_date', { count: 'exact' }),
      supabase.from('stores').select('id, kaspi_merchant_id', { count: 'exact' }),
    ]);

    const totalUsers = usersResult.count || 0;
    const users = usersResult.data || [];
    const subscriptions = subsResult.data || [];
    const totalStores = storesResult.count || 0;

    // Active subscriptions
    const activeSubscriptions = subscriptions.filter(s => (s as any).status === 'active').length;

    // Stores with Kaspi connected
    const kaspiConnected = (storesResult.data || []).filter(s => (s as any).kaspi_merchant_id).length;

    // Plan distribution
    const planCounts: Record<string, number> = {};
    for (const sub of subscriptions) {
      const plan = (sub as any).plan || 'start';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    }

    // Registrations by day (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = users.filter(u => {
      const created = new Date((u as any).created_at);
      return created >= thirtyDaysAgo;
    });

    const registrationsByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      registrationsByDay[d.toISOString().split('T')[0]] = 0;
    }
    for (const u of recentUsers) {
      const day = new Date((u as any).created_at).toISOString().split('T')[0];
      if (registrationsByDay[day] !== undefined) registrationsByDay[day]++;
    }

    // Convert to sorted array
    const registrations = Object.entries(registrationsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeSubscriptions,
        totalStores,
        kaspiConnected,
        newUsersLast30Days: recentUsers.length,
        planDistribution: planCounts,
        registrations,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
