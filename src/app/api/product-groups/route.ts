import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const storeResult = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('product_groups')
      .select('id, name, slug, color')
      .eq('store_id', storeResult.data.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { name, color } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, message: 'name обязателен' }, { status: 400 });
    }

    const storeResult = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const slug = toSlug(name);

    const { data, error } = await supabaseAdmin
      .from('product_groups')
      .insert({
        store_id: storeResult.data.id,
        name: name.trim(),
        slug,
        color: color || '#6b7280',
      })
      .select('id, name, slug, color')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, message: 'Группа с таким названием уже существует' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ success: false, message: 'slug обязателен' }, { status: 400 });
    }

    const storeResult = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const storeId = storeResult.data.id;

    // Удалить группу
    const { error } = await supabaseAdmin
      .from('product_groups')
      .delete()
      .eq('store_id', storeId)
      .eq('slug', slug);

    if (error) throw error;

    // Обнулить product_group у товаров и расходов
    await supabaseAdmin
      .from('products')
      .update({ product_group: null })
      .eq('store_id', storeId)
      .eq('product_group', slug);

    await supabaseAdmin
      .from('operational_expenses')
      .update({ product_group: null })
      .eq('store_id', storeId)
      .eq('product_group', slug);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
