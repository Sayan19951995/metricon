import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, supabaseAdmin } from '@/lib/api-auth';
import { waSendMessage } from '@/lib/whatsapp/client';

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

  // Get notification phone from app_settings
  const { data: settingsRow } = await supabaseAdmin
    .from('app_settings' as any)
    .select('value')
    .eq('key', 'notification_phone')
    .single();

  const notifPhone = (settingsRow as any)?.value;
  if (!notifPhone) {
    return NextResponse.json({ success: false, message: 'Номер уведомлений не настроен' }, { status: 500 });
  }

  const message =
    `💳 *Запрос на оплату подписки*\n\n` +
    `👤 Клиент: ${userName} (${userEmail})\n` +
    `📋 Тариф: ${planName} — ${price.toLocaleString('ru-RU')} ₸/мес\n` +
    `📱 Kaspi номер: ${kaspiPhone}\n\n` +
    `Выставите счёт и активируйте подписку в админке:\n` +
    `metricon.kz/admin/subscriptions`;

  await waSendMessage('metricon-global', notifPhone, message);

  return NextResponse.json({ success: true });
}
