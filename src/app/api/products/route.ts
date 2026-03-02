import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    let resolvedStoreId = storeId;

    if (!resolvedStoreId) {
      // Try owner's store first
      const storeResult = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (storeResult.data) {
        resolvedStoreId = storeResult.data.id;
      } else {
        // Fallback: team member — find store via team_members
        const { data: membership } = await (supabaseAdmin as any)
          .from('team_members')
          .select('store_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();
        if (membership) {
          resolvedStoreId = membership.store_id;
        }
      }
    }

    if (!resolvedStoreId) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const productsResult = await supabaseAdmin
      .from('products')
      .select('kaspi_id, name, price, cost_price, image_url')
      .eq('store_id', resolvedStoreId)
      .order('name', { ascending: true });
    const products = productsResult.data || [];

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { kaspiId, productGroup, costPrice } = await request.json();

    if (!kaspiId) {
      return NextResponse.json({ success: false, message: 'kaspiId обязателен' }, { status: 400 });
    }

    // Resolve store — support both owner and team member
    let storeId: string | null = null;
    const storeResult = await supabaseAdmin.from('stores').select('id').eq('user_id', userId).single();
    if (storeResult.data) {
      storeId = storeResult.data.id;
    } else {
      const { data: membership } = await (supabaseAdmin as any)
        .from('team_members')
        .select('store_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      if (membership) storeId = membership.store_id;
    }

    if (!storeId) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (productGroup !== undefined) updates.product_group = productGroup || null;
    if (costPrice !== undefined) updates.cost_price = costPrice;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: 'Нет полей для обновления' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('store_id', storeId)
      .eq('kaspi_id', kaspiId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
