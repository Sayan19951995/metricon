import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

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
    const store = storeResult.data;

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const expensesResult = await supabaseAdmin
      .from('operational_expenses')
      .select('*')
      .eq('store_id', store.id)
      .order('start_date', { ascending: false });
    const expenses = expensesResult.data || [];

    return NextResponse.json({ success: true, data: expenses });
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

    const body = await request.json();
    const { name, amount, startDate, endDate, productId, productGroup } = body;

    if (!name || !amount || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: 'Все поля обязательны' }, { status: 400 });
    }

    const storeResult2 = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();
    const store2 = storeResult2.data;

    if (!store2) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const expenseResult = await supabaseAdmin.from('operational_expenses')
      .insert({
        store_id: store2.id,
        name,
        amount,
        start_date: startDate,
        end_date: endDate,
        product_id: productId || null,
        product_group: productGroup || null,
      })
      .select()
      .single();
    const expense = expenseResult.data;
    const error = expenseResult.error;

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: expense });
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'id обязателен' }, { status: 400 });
    }

    const storeResult3 = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();
    const store3 = storeResult3.data;

    if (!store3) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    await supabaseAdmin.from('operational_expenses')
      .delete()
      .eq('id', id)
      .eq('store_id', store3.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
