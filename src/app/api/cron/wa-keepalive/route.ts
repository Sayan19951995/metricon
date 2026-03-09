/**
 * Vercel Cron: keepalive для WhatsApp сессии.
 * Запускается каждые 15 минут — проверяет статус WA сессии.
 * НЕ переподключает — WhatsApp требует участия человека (QR/код).
 */

import { NextRequest, NextResponse } from 'next/server';
import { waGetStatus } from '@/lib/whatsapp/client';

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
    return NextResponse.json({ ok: true, status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 }); // 200 so Vercel doesn't alert
  }
}
