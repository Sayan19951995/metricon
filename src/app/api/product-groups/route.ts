import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');
}

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

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const { data, error } = await supabase
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
    const { userId, name, color } = await request.json();

    if (!userId || !name) {
      return NextResponse.json({ success: false, message: 'userId и name обязательны' }, { status: 400 });
    }

    const storeResult = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const slug = toSlug(name);

    const { data, error } = await supabase
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const slug = searchParams.get('slug');

    if (!userId || !slug) {
      return NextResponse.json({ success: false, message: 'userId и slug обязательны' }, { status: 400 });
    }

    const storeResult = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!storeResult.data) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const storeId = storeResult.data.id;

    // Удалить группу
    const { error } = await supabase
      .from('product_groups')
      .delete()
      .eq('store_id', storeId)
      .eq('slug', slug);

    if (error) throw error;

    // Обнулить product_group у товаров и расходов
    await supabase
      .from('products')
      .update({ product_group: null })
      .eq('store_id', storeId)
      .eq('product_group', slug);

    await supabase
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
