import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth;
  const { data: adminUser } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', auth.user.id)
    .single();
  if (!(adminUser as any)?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return (auth as any).error;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const [usersResult, storesResult, subsResult, statsResult] = await Promise.all([
    supabaseAdmin.from('users').select('id, name, email, created_at'),
    supabaseAdmin.from('stores').select('id, user_id, name'),
    supabaseAdmin.from('subscriptions').select('user_id, plan, status, end_date'),
    (supabaseAdmin as any).from('daily_stats').select('store_id, revenue, orders_count').gte('date', cutoff),
  ]);

  const users: any[] = usersResult.data || [];
  const stores: any[] = storesResult.data || [];
  const subs: any[] = subsResult.data || [];
  const stats: any[] = statsResult.data || [];

  const userMap = new Map(users.map(u => [u.id, u]));
  const storeMap = new Map(stores.map(s => [s.id, s]));

  // Revenue and orders per store
  const revenueByStore = new Map<string, number>();
  const ordersByStore = new Map<string, number>();
  for (const s of stats) {
    revenueByStore.set(s.store_id, (revenueByStore.get(s.store_id) || 0) + (s.revenue || 0));
    ordersByStore.set(s.store_id, (ordersByStore.get(s.store_id) || 0) + (s.orders_count || 0));
  }

  // Top users by revenue
  const revenueByUser = new Map<string, { revenue: number; storeName: string; userId: string }>();
  for (const [storeId, revenue] of revenueByStore) {
    const store = storeMap.get(storeId);
    if (!store) continue;
    const existing = revenueByUser.get(store.user_id);
    if (!existing || revenue > existing.revenue) {
      revenueByUser.set(store.user_id, { revenue, storeName: store.name, userId: store.user_id });
    }
  }

  const topUsersByRevenue = [...revenueByUser.entries()]
    .map(([userId, { revenue, storeName }]) => {
      const user = userMap.get(userId);
      return { userId, name: user?.name || '—', email: user?.email || '—', storeName, revenue };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Most active stores
  const mostActiveStores = [...ordersByStore.entries()]
    .map(([storeId, orders]) => {
      const store = storeMap.get(storeId);
      return { storeId, storeName: store?.name || storeId, orders };
    })
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);

  // Plan stats
  const activeUserIds = new Set<string>();
  const planCounts: Record<string, { active: number; trial: number; expired: number }> = {
    start: { active: 0, trial: 0, expired: 0 },
    business: { active: 0, trial: 0, expired: 0 },
    pro: { active: 0, trial: 0, expired: 0 },
  };
  for (const sub of subs) {
    if (sub.status === 'active' || sub.status === 'trial') {
      activeUserIds.add(sub.user_id);
    }
    const plan = sub.plan || 'start';
    if (!planCounts[plan]) planCounts[plan] = { active: 0, trial: 0, expired: 0 };
    if (sub.status === 'active') planCounts[plan].active++;
    else if (sub.status === 'trial') planCounts[plan].trial++;
    else planCounts[plan].expired++;
  }

  // Users without active subscription
  const usersWithoutSubscription = users
    .filter(u => !activeUserIds.has(u.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50)
    .map(u => ({ id: u.id, name: u.name || '—', email: u.email, createdAt: u.created_at }));

  return NextResponse.json({
    topUsersByRevenue,
    mostActiveStores,
    planStats: planCounts,
    usersWithoutSubscription,
    totalWithoutSub: users.filter(u => !activeUserIds.has(u.id)).length,
  });
}
