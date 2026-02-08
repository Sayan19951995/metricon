import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Проверяем подключение к БД
    const usersResult = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .limit(10);
    const users = usersResult.data || [];
    const usersError = usersResult.error;

    if (usersError) {
      return NextResponse.json({
        status: 'error',
        message: usersError.message
      }, { status: 500 });
    }

    // Считаем количество записей
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: storesCount } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true });

    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      status: 'success',
      database: 'connected',
      counts: {
        users: usersCount || 0,
        stores: storesCount || 0,
        orders: ordersCount || 0,
      },
      recentUsers: users || []
    });

  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: String(err)
    }, { status: 500 });
  }
}
