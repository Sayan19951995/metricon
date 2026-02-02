import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Получаем тестового пользователя с магазином и подпиской
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@luxstone.kz')
      .single();

    if (userError) {
      return NextResponse.json({
        status: 'error',
        message: userError.message
      }, { status: 500 });
    }

    // Получаем магазин
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Получаем подписку
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      status: 'success',
      user,
      store,
      subscription
    });

  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: String(err)
    }, { status: 500 });
  }
}
