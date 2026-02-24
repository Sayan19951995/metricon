import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const storeId = searchParams.get('storeId');

    if (!userId && !storeId) {
      return NextResponse.json({ success: false, message: 'userId или storeId обязателен' }, { status: 400 });
    }

    let resolvedStoreId = storeId;

    if (!resolvedStoreId && userId) {
      // Try owner's store first
      const storeResult = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (storeResult.data) {
        resolvedStoreId = storeResult.data.id;
      } else {
        // Fallback: team member — find store via team_members
        const { data: membership } = await (supabase as any)
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

    const productsResult = await supabase
      .from('products')
      .select('kaspi_id, name, price, cost_price')
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
    const { userId, kaspiId, productGroup } = await request.json();

    if (!userId || !kaspiId) {
      return NextResponse.json({ success: false, message: 'userId и kaspiId обязательны' }, { status: 400 });
    }

    const storeResult = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const { error } = await supabase
      .from('products')
      .update({ product_group: productGroup || null })
      .eq('store_id', storeResult.data.id)
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
