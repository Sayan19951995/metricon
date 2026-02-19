import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// POST — add custom keyword
export async function POST(request: NextRequest) {
  try {
    const { userId, productId, keyword } = await request.json();

    if (!userId || !productId || !keyword?.trim()) {
      return NextResponse.json({ success: false, message: 'Все поля обязательны' }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('search_keywords')
      .insert({
        store_id: store.id,
        product_id: productId,
        keyword: keyword.trim(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, message: 'Такой запрос уже существует' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, keyword: data });
  } catch (error) {
    console.error('Keywords POST error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// DELETE — remove custom keyword
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const keywordId = searchParams.get('keywordId');

    if (!userId || !keywordId) {
      return NextResponse.json({ success: false, message: 'userId и keywordId обязательны' }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    await supabase
      .from('search_keywords')
      .delete()
      .eq('id', keywordId)
      .eq('store_id', store.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Keywords DELETE error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
