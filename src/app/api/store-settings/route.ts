import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('commission_rate, tax_rate')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        commissionRate: store.commission_rate ?? 12.5,
        taxRate: store.tax_rate ?? 4.0,
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, commissionRate, taxRate } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const update: Record<string, number> = {};
    if (commissionRate !== undefined) update.commission_rate = commissionRate;
    if (taxRate !== undefined) update.tax_rate = taxRate;

    const { error } = await supabase.from('stores')
      .update(update)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
