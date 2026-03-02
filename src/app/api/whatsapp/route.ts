import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth, requireRole } from '@/lib/api-auth';
import { waStartSession, waGetStatus, waDisconnect, waSendMessage } from '@/lib/whatsapp/client';

// POST — начать сессию WhatsApp (генерация QR)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const body = await request.json();
    const { testPhone, testMessage } = body;

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
      await supabaseAdmin
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
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    const result = await waGetStatus(auth.store.id);

    // Синхронизируем статус в БД
    const isConnected = result.status === 'connected';
    await supabaseAdmin
      .from('stores')
      .update({ whatsapp_connected: isConnected })
      .eq('id', auth.store.id);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    // Если WA сервер недоступен — отдаём статус из БД
    const fallbackAuth = await requireAuth(request);
    if (!('error' in fallbackAuth)) {
      const fallbackUserId = fallbackAuth.user.id;
      const auth = await requireRole(fallbackUserId, ['owner', 'admin']);
      if (!('error' in auth)) {
        const { data: store } = await supabaseAdmin
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
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    await waDisconnect(auth.store.id);

    await supabaseAdmin
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
