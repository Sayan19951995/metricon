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

    const expensesResult = await supabase
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
    const body = await request.json();
    const { userId, name, amount, startDate, endDate, productId } = body;

    if (!userId || !name || !amount || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: 'Все поля обязательны' }, { status: 400 });
    }

    const storeResult2 = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();
    const store2 = storeResult2.data;

    if (!store2) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    const expenseResult = await supabase.from('operational_expenses')
      .insert({
        store_id: store2.id,
        name,
        amount,
        start_date: startDate,
        end_date: endDate,
        product_id: productId || null,
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (!userId || !id) {
      return NextResponse.json({ success: false, message: 'userId и id обязательны' }, { status: 400 });
    }

    const storeResult3 = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single();
    const store3 = storeResult3.data;

    if (!store3) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    await supabase.from('operational_expenses')
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
