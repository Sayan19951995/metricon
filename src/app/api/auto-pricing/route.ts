import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth, requireRole } from '@/lib/api-auth';

/**
 * GET /api/auto-pricing?userId=xxx
 * Список правил автоцены для магазина
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    // Load rules
    const { data: rules, error } = await (supabaseAdmin as any)
      .from('auto_pricing_rules')
      .select('*')
      .eq('store_id', auth.store.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AutoPricing] GET rules error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Count price changes in last 24h per rule
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentChanges } = await (supabaseAdmin as any)
      .from('price_change_history')
      .select('sku')
      .eq('store_id', auth.store.id)
      .gte('created_at', oneDayAgo);

    const changesPerSku: Record<string, number> = {};
    if (recentChanges) {
      for (const ch of recentChanges) {
        changesPerSku[ch.sku] = (changesPerSku[ch.sku] || 0) + 1;
      }
    }

    // Attach priceChanges24h to each rule
    const rulesWithStats = (rules || []).map((r: any) => ({
      ...r,
      price_changes_24h: changesPerSku[r.sku] || 0,
    }));

    return NextResponse.json({ success: true, rules: rulesWithStats });
  } catch (err: any) {
    console.error('[AutoPricing] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/auto-pricing
 * Создать или обновить правило (upsert по store_id + sku)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const body = await request.json();
    const { sku, productName, strategy, minPrice, maxPrice, step, targetPosition } = body;

    if (!sku) {
      return NextResponse.json({ success: false, error: 'sku обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    if (minPrice >= maxPrice) {
      return NextResponse.json({ success: false, error: 'minPrice должен быть меньше maxPrice' }, { status: 400 });
    }

    const ruleData = {
      store_id: auth.store.id,
      sku,
      product_name: productName || null,
      strategy: strategy || 'undercut',
      min_price: minPrice,
      max_price: maxPrice,
      step: step || 1000,
      target_position: strategy === 'position' ? (targetPosition || 1) : null,
      status: 'active',
      error_message: null,
    };

    // Upsert: if rule exists for this store+sku, update it
    const { data: existing } = await (supabaseAdmin as any)
      .from('auto_pricing_rules')
      .select('id')
      .eq('store_id', auth.store.id)
      .eq('sku', sku)
      .single();

    let result;
    if (existing) {
      result = await (supabaseAdmin as any)
        .from('auto_pricing_rules')
        .update(ruleData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await (supabaseAdmin as any)
        .from('auto_pricing_rules')
        .insert(ruleData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[AutoPricing] POST error:', result.error);
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rule: result.data });
  } catch (err: any) {
    console.error('[AutoPricing] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/auto-pricing
 * Изменить статус правила (pause/resume)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const validStatuses = ['active', 'paused'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Неверный статус' }, { status: 400 });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('auto_pricing_rules')
      .update({ status, error_message: null } as any)
      .eq('id', id)
      .eq('store_id', auth.store.id)
      .select()
      .single();

    if (error) {
      console.error('[AutoPricing] PATCH error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rule: data });
  } catch (err: any) {
    console.error('[AutoPricing] PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/auto-pricing?userId=xxx&id=xxx
 * Удалить правило
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { error } = await (supabaseAdmin as any)
      .from('auto_pricing_rules')
      .delete()
      .eq('id', id)
      .eq('store_id', auth.store.id);

    if (error) {
      console.error('[AutoPricing] DELETE error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[AutoPricing] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
