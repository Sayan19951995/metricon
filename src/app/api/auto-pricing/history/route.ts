import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth, requireRole } from '@/lib/api-auth';

/**
 * GET /api/auto-pricing/history?userId=xxx&sku=&type=&period=
 * История изменений цен
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const type = searchParams.get('type'); // decrease, increase, match
    const period = searchParams.get('period'); // today, week, month, all
    const limit = parseInt(searchParams.get('limit') || '100');

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    let query = (supabaseAdmin as any)
      .from('price_change_history')
      .select('*')
      .eq('store_id', auth.store.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sku) {
      query = query.eq('sku', sku);
    }

    if (type && type !== 'all') {
      query = query.eq('change_type', type);
    }

    if (period && period !== 'all') {
      const now = new Date();
      let cutoff: Date;
      if (period === 'today') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        cutoff = new Date(0);
      }
      query = query.gte('created_at', cutoff.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AutoPricing/History] GET error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, history: data || [] });
  } catch (err: any) {
    console.error('[AutoPricing/History] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
