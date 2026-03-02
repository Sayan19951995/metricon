import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

// POST — add custom keyword
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { productId, keyword } = await request.json();

    if (!productId || !keyword?.trim()) {
      return NextResponse.json({ success: false, message: 'productId и keyword обязательны' }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
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
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get('keywordId');

    if (!keywordId) {
      return NextResponse.json({ success: false, message: 'keywordId обязателен' }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    await supabaseAdmin
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
