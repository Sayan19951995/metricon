/**
 * Vercel Cron: уведомление об истечении подписки за 3 дня.
 * Запускается ежедневно в 4:00 UTC (9:00 KZ).
 *
 * Находит подписки status='active' с end_date = today+3
 * и отправляет WhatsApp пользователю.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { waSendMessage } from '@/lib/whatsapp/client';

const PLAN_NAMES: Record<string, string> = {
  start: 'Старт',
  business: 'Бизнес',
  pro: 'Pro',
  free: 'Free',
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Date 3 days from now (UTC)
  const target = new Date();
  target.setDate(target.getDate() + 3);
  const targetDate = target.toISOString().split('T')[0];

  const { data: expiring, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, plan, end_date')
    .eq('status', 'active')
    .eq('end_date', targetDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ success: true, sent: 0 });
  }

  let sent = 0;

  for (const sub of expiring as any[]) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('phone, name')
      .eq('id', sub.user_id)
      .single();

    const phone = (user as any)?.phone;
    if (!phone) continue;

    const planName = PLAN_NAMES[sub.plan] ?? sub.plan;
    const endDateFmt = new Date(sub.end_date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const message =
      `⏰ *Напоминание о подписке Metricon*\n\n` +
      `Ваш тариф *${planName}* истекает через 3 дня — ${endDateFmt}.\n\n` +
      `Чтобы продолжить пользоваться сервисом, оплатите подписку на странице:\n` +
      `metricon.kz/app/subscription\n\n` +
      `По вопросам напишите нам.`;

    const ok = await waSendMessage('metricon-global', phone, message);
    if (ok) sent++;
  }

  return NextResponse.json({ success: true, sent, total: expiring.length });
}
