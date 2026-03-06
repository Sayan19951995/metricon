import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, supabaseAdmin } from '@/lib/api-auth';
import { waSendMessage } from '@/lib/whatsapp/client';

export const maxDuration = 30; // seconds — allow time for WA reconnect

const PLAN_NAMES: Record<string, string> = {
  start: 'Старт',
  business: 'Бизнес',
  pro: 'Pro',
};

const PLAN_PRICES: Record<string, number> = {
  start: 9900,
  business: 14900,
  pro: 24900,
};

/** POST /api/subscriptions/request-payment */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const { planId, kaspiPhone } = body;

  if (!planId || !kaspiPhone) {
    return NextResponse.json({ success: false, message: 'planId и kaspiPhone обязательны' }, { status: 400 });
  }

  const planName = PLAN_NAMES[planId] ?? planId;
  const price = PLAN_PRICES[planId] ?? 0;

  // Get user info
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('id', auth.user.id)
    .single();

  const userName = (userData as any)?.name || auth.user.email;
  const userEmail = auth.user.email;

  // Save payment request to DB
  await supabaseAdmin
    .from('payment_requests' as any)
    .insert({
      user_id: auth.user.id,
      user_name: userName,
      user_email: userEmail,
      plan_id: planId,
      plan_name: planName,
      price,
      kaspi_phone: kaspiPhone,
      status: 'pending',
    });

  // Get notification phone from app_settings
  const { data: settingsRow, error: settingsError } = await supabaseAdmin
    .from('app_settings' as any)
    .select('value')
    .eq('key', 'notification_phone')
    .single();

  const notifPhone = (settingsRow as any)?.value;
  console.log('[request-payment] notifPhone:', notifPhone, 'settingsError:', settingsError?.message);

  let waSent = false;
  let waError: string | null = null;

  if (!notifPhone) {
    waError = 'notification_phone не настроен в app_settings';
    console.error('[request-payment]', waError);
  } else {
    const waMessage =
      `💳 *Запрос на оплату подписки*\n\n` +
      `👤 Клиент: ${userName} (${userEmail})\n` +
      `📋 Тариф: ${planName} — ${price.toLocaleString('ru-RU')} ₸/мес\n` +
      `📱 Kaspi номер: ${kaspiPhone}\n\n` +
      `Подтвердите заявку в админке:\n` +
      `metricon.kz/admin/payment-requests`;

    waSent = await waSendMessage('metricon-global', notifPhone, waMessage);
    console.log('[request-payment] waSent:', waSent, 'to:', notifPhone);
    if (!waSent) waError = 'waSendMessage вернул false (WA не подключён?)';
  }

  return NextResponse.json({ success: true, waSent, waError });
}
