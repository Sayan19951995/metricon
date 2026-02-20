import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';
import { waStartSession, waGetStatus, waDisconnect, waSendMessage } from '@/lib/whatsapp/client';

// POST — начать сессию WhatsApp (генерация QR)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, testPhone, testMessage } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    // Тестовое сообщение
    if (testPhone && testMessage) {
      const sent = await waSendMessage(auth.store.id, testPhone, testMessage);
      return NextResponse.json({ success: sent });
    }

    // Начать сессию (QR)
    const result = await waStartSession(auth.store.id);

    // Если подключен — обновляем статус в stores
    if (result.status === 'connected') {
      await supabase
        .from('stores')
        .update({ whatsapp_connected: true })
        .eq('id', auth.store.id);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('WhatsApp POST error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// GET — статус подключения + QR
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    const result = await waGetStatus(auth.store.id);

    // Синхронизируем статус в БД
    const isConnected = result.status === 'connected';
    await supabase
      .from('stores')
      .update({ whatsapp_connected: isConnected })
      .eq('id', auth.store.id);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    // Если WA сервер недоступен — отдаём статус из БД
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (userId) {
      const auth = await requireRole(userId, ['owner', 'admin']);
      if (!('error' in auth)) {
        const { data: store } = await supabase
          .from('stores')
          .select('whatsapp_connected')
          .eq('id', auth.store.id)
          .single();
        return NextResponse.json({
          success: true,
          status: store?.whatsapp_connected ? 'connected' : 'disconnected',
          qr: null,
          serverOffline: true,
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// DELETE — отключить WhatsApp
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    await waDisconnect(auth.store.id);

    await supabase
      .from('stores')
      .update({ whatsapp_connected: false, whatsapp_session: null })
      .eq('id', auth.store.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
