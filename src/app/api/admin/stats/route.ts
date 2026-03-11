import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

const PLAN_PRICES: Record<string, number> = {
  start: 4990,
  business: 9990,
  pro: 19990,
};

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    // Check admin
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!(adminUser as any)?.is_admin) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    // Parallel queries for stats
    // Note: use select('*') for subscriptions/stores since created_at may not exist
    const [usersResult, subsResult, storesResult, teamMembersResult] = await Promise.all([
      supabaseAdmin.from('users').select('id, name, email, created_at, updated_at', { count: 'exact' }),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact' }),
      supabaseAdmin.from('stores').select('*', { count: 'exact' }),
      supabaseAdmin.from('team_members' as any).select('id, store_id, email, name, role, created_at'),
    ]);

    const totalUsers = usersResult.count || 0;
    const users = (usersResult.data || []) as any[];
    const subscriptions = (subsResult.data || []) as any[];
    const teamMembers = (teamMembersResult.data || []) as any[];
    const stores = (storesResult.data || []) as any[];
    const totalStores = storesResult.count || 0;

    // Active subscriptions
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;

    // Stores with Kaspi connected
    const kaspiConnected = stores.filter(s => s.kaspi_merchant_id).length;

    // Plan distribution
    const planCounts: Record<string, number> = {};
    for (const sub of subscriptions) {
      const plan = sub.plan || 'start';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    }

    // Registrations by day (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = users.filter(u => new Date(u.created_at) >= thirtyDaysAgo);

    const registrationsByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      registrationsByDay[d.toISOString().split('T')[0]] = 0;
    }
    for (const u of recentUsers) {
      const day = new Date(u.created_at).toISOString().split('T')[0];
      if (registrationsByDay[day] !== undefined) registrationsByDay[day]++;
    }

    const registrations = Object.entries(registrationsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // === NEW: Conversion funnel ===
    const subscribedUsers = new Set(subscriptions.map(s => s.user_id));
    const kaspiUsers = new Set(stores.filter(s => s.kaspi_merchant_id).map(s => s.user_id));
    const conversionFunnel = {
      registered: totalUsers,
      subscribed: subscribedUsers.size,
      kaspiConnected: kaspiUsers.size,
    };

    // === NEW: MRR (monthly recurring revenue) ===
    let mrr = 0;
    for (const sub of subscriptions) {
      if (sub.status === 'active') {
        mrr += PLAN_PRICES[sub.plan] || 0;
      }
    }

    // === NEW: Activity feed (last 15 events) ===
    // Only consider last 30 days to avoid processing entire DB
    type ActivityEvent = { type: string; name: string; email: string; date: string; detail?: string };
    const events: ActivityEvent[] = [];
    const cutoff = thirtyDaysAgo.toISOString();

    // Recent registrations (last 30 days only)
    for (const u of users) {
      if (u.created_at && u.created_at >= cutoff) {
        events.push({
          type: 'registration',
          name: u.name,
          email: u.email,
          date: u.created_at,
        });
      }
    }

    // Recent subscriptions (use start_date — created_at may not exist)
    for (const sub of subscriptions) {
      const subDate = sub.start_date;
      if (subDate && subDate >= cutoff) {
        const u = users.find(x => x.id === sub.user_id);
        if (u) {
          events.push({
            type: 'subscription',
            name: u.name,
            email: u.email,
            date: subDate,
            detail: sub.plan,
          });
        }
      }
    }

    // Kaspi API connected (kaspi_api_key set, use store.created_at as proxy date)
    for (const store of stores) {
      if (store.kaspi_merchant_id) {
        const storeDate = store.created_at;
        if (storeDate && storeDate >= cutoff) {
          const u = users.find(x => x.id === store.user_id);
          if (u) {
            events.push({
              type: 'kaspi_connected',
              name: u.name,
              email: u.email,
              date: storeDate,
              detail: store.name,
            });
          }
        }
      }

      // Kaspi API key connected
      if (store.kaspi_api_key) {
        const apiDate = (store as any).kaspi_api_connected_at || store.created_at;
        if (apiDate && apiDate >= cutoff) {
          const u = users.find(x => x.id === store.user_id);
          if (u) {
            events.push({
              type: 'kaspi_api_connected',
              name: u.name,
              email: u.email,
              date: apiDate,
              detail: store.name,
            });
          }
        }
      }

      // Kaspi Cabinet connected
      const kaspiSession = (store as any).kaspi_session;
      if (kaspiSession?.created_at && kaspiSession.created_at >= cutoff) {
        const u = users.find(x => x.id === store.user_id);
        if (u) {
          events.push({
            type: 'kaspi_cabinet_connected',
            name: u.name,
            email: u.email,
            date: kaspiSession.created_at,
            detail: store.name,
          });
        }
      }

      // Kaspi Marketing connected
      const marketingSession = (store as any).marketing_session;
      if (marketingSession?.created_at && marketingSession.created_at >= cutoff) {
        const u = users.find(x => x.id === store.user_id);
        if (u) {
          events.push({
            type: 'kaspi_marketing_connected',
            name: u.name,
            email: u.email,
            date: marketingSession.created_at,
            detail: marketingSession.merchant_name || store.name,
          });
        }
      }
    }

    // Profile updates (users with updated_at recently, different day from created_at)
    for (const u of users) {
      if (u.updated_at && u.updated_at >= cutoff) {
        const createdDay = u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : null;
        const updatedDay = new Date(u.updated_at).toISOString().split('T')[0];
        if (createdDay !== updatedDay) {
          events.push({
            type: 'profile_updated',
            name: u.name,
            email: u.email,
            date: u.updated_at,
          });
        }
      }
    }

    // Subscription plan changes (updated_at recent, different day from start_date)
    for (const sub of subscriptions) {
      if (sub.updated_at && sub.updated_at >= cutoff) {
        const startDay = sub.start_date || null;
        const updatedDay = new Date(sub.updated_at).toISOString().split('T')[0];
        if (startDay !== updatedDay) {
          const u = users.find(x => x.id === sub.user_id);
          if (u) {
            events.push({
              type: 'subscription_updated',
              name: u.name,
              email: u.email,
              date: sub.updated_at,
              detail: sub.plan,
            });
          }
        }
      }
    }

    // Team member added
    const storeMap = new Map(stores.map((s: any) => [s.id, s]));
    for (const member of teamMembers) {
      if (member.created_at && member.created_at >= cutoff) {
        const store = storeMap.get(member.store_id);
        events.push({
          type: 'team_member_added',
          name: member.name || member.email,
          email: member.email,
          date: member.created_at,
          detail: `${member.role}${store ? ` — ${store.name}` : ''}`,
        });
      }
    }

    // Sort by date desc, take last 15
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentActivity = events.slice(0, 15);

    // === NEW: Recent 5 users ===
    const latestUsers = users
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((u: any) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.created_at }));

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
        conversionFunnel,
        mrr,
        recentActivity,
        latestUsers,
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
