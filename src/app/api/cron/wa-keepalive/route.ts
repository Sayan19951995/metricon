/**
 * Vercel Cron: keepalive для WhatsApp сессии.
 * Запускается каждые 15 минут — пингует WA сервер чтобы сессия не умирала.
 * Если сессия потерялась — пробует переподключить из сохранённых credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { waGetStatus, waStartSession } from '@/lib/whatsapp/client';

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { status } = await waGetStatus('metricon-global');

    if (status === 'connected') {
      return NextResponse.json({ ok: true, status: 'connected' });
    }

    // Session lost — try to reconnect silently using saved credentials
    if (status === 'disconnected' || status === 'not_registered') {
      const result = await waStartSession('metricon-global');
      return NextResponse.json({ ok: true, status: result.status, reconnected: true });
    }

    return NextResponse.json({ ok: true, status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 }); // 200 so Vercel doesn't alert
  }
}
