import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const storeResult = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const productsResult = await supabase
      .from('products')
      .select('kaspi_id, name')
      .eq('store_id', store.id)
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
