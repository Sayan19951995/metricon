import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    // Check admin
    const { data: adminUser } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!(adminUser as any)?.is_admin) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    // Get subscriptions with user info
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, start_date, end_date, auto_renew')
      .order('start_date', { ascending: false });

    if (error) throw error;

    // Get user names
    const userIds = [...new Set((subscriptions || []).map(s => (s as any).user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    const userMap = new Map<string, { name: string; email: string }>();
    for (const u of (users || [])) {
      userMap.set(u.id, { name: u.name, email: u.email });
    }

    const enriched = (subscriptions || []).map(s => {
      const user = userMap.get((s as any).user_id);
      return {
        id: s.id,
        userId: (s as any).user_id,
        userName: user?.name || 'Неизвестный',
        userEmail: user?.email || '',
        plan: s.plan,
        status: s.status,
        startDate: s.start_date,
        endDate: s.end_date,
        autoRenew: s.auto_renew,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
