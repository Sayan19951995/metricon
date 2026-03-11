import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

export interface ClientAlert {
  storeId: string;
  storeName: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'marketing' | 'cabinet';
  lastAttempt: string; // ISO date
  minutesAgo: number;
}

/**
 * GET /api/admin/alerts
 * Returns stores with failed Kaspi reconnect attempts (marketing or cabinet).
 * A `last_reconnect_attempt` field in the session JSON means auto-reconnect was triggered and failed.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;

    // Check admin
    const { data: adminCheck } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', auth.user.id)
      .single();

    if (!(adminCheck as any)?.is_admin) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Fetch all stores with marketing or kaspi session that have reconnect attempts
    const { data: stores, error } = await supabaseAdmin
      .from('stores')
      .select('id, name, user_id, marketing_session, kaspi_session');

    if (error) throw error;

    // Fetch users for those stores
    const userIds = [...new Set((stores || []).map(s => s.user_id).filter(Boolean))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .in('id', userIds as string[]);

    const userMap = new Map((users || []).map(u => [u.id, u]));
    const now = Date.now();
    const alerts: ClientAlert[] = [];

    for (const store of stores || []) {
      const user = userMap.get(store.user_id as string);
      if (!user) continue;

      const marketingSession = store.marketing_session as any;
      const kaspiSession = store.kaspi_session as any;

      if (marketingSession?.last_reconnect_attempt) {
        const attemptTime = new Date(marketingSession.last_reconnect_attempt).getTime();
        const minutesAgo = Math.floor((now - attemptTime) / 60000);
        alerts.push({
          storeId: store.id,
          storeName: store.name,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          type: 'marketing',
          lastAttempt: marketingSession.last_reconnect_attempt,
          minutesAgo,
        });
      }

      if (kaspiSession?.last_reconnect_attempt) {
        const attemptTime = new Date(kaspiSession.last_reconnect_attempt).getTime();
        const minutesAgo = Math.floor((now - attemptTime) / 60000);
        alerts.push({
          storeId: store.id,
          storeName: store.name,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          type: 'cabinet',
          lastAttempt: kaspiSession.last_reconnect_attempt,
          minutesAgo,
        });
      }
    }

    // Sort by most recent first
    alerts.sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime());

    return NextResponse.json({ success: true, alerts });
  } catch (err) {
    console.error('Admin alerts error:', err);
    return NextResponse.json({ success: false, message: 'Внутренняя ошибка' }, { status: 500 });
  }
}
