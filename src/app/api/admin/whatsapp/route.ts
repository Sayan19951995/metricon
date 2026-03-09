import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { waSendMessage, waStartSession, waGetStatus, waDisconnect, waGetLogs } from '@/lib/whatsapp/client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth;

  const { data: adminUser } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', auth.user.id)
    .single();

  if (!(adminUser as any)?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}

// Global session uses a fixed storeId
const GLOBAL_STORE_ID = 'metricon-global';

/**
 * GET /api/admin/whatsapp
 * List all stores + global WA session status
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  // Get global WA session status
  let waStatus = 'disconnected';
  let waQr: string | null = null;
  let waPairingCode: string | null = null;
  try {
    const result = await waGetStatus(GLOBAL_STORE_ID);
    waStatus = result.status;
    waQr = result.qr;
    waPairingCode = result.pairingCode || null;
  } catch {
    waStatus = 'server_offline';
  }

  const { data: stores } = await (supabaseAdmin
    .from('stores')
    .select('id, name, user_id, kaspi_merchant_id, whatsapp_connected')
    .order('name') as any);

  if (!stores) {
    return NextResponse.json({ stores: [], waStatus, waQr, pairingCode: waPairingCode });
  }

  // Enrich with user info
  const userIds = [...new Set(stores.map((s: any) => s.user_id).filter(Boolean))];
  const { data: users } = userIds.length > 0
    ? await supabaseAdmin.from('users').select('id, name, email, phone').in('id', userIds as string[])
    : { data: [] };

  const userMap = new Map((users || []).map((u: any) => [u.id, u]));

  const enriched = stores.map((s: any) => {
    const user = userMap.get(s.user_id) as any;
    return {
      id: s.id,
      name: s.name,
      kaspi_merchant_id: s.kaspi_merchant_id,
      whatsapp_connected: s.whatsapp_connected || false,
      owner_name: user?.name || '—',
      owner_email: user?.email || '—',
      owner_phone: user?.phone || '',
    };
  });

  return NextResponse.json({ stores: enriched, waStatus, waQr, pairingCode: waPairingCode });
}

/**
 * PATCH /api/admin/whatsapp
 * Actions: toggle, send_test, connect, disconnect
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const { action, storeId, phone, message } = body;

  if (action === 'connect' || action === 'force_reconnect') {
    try {
      // force_reconnect: disconnect first to clear stale session + credentials
      if (action === 'force_reconnect') {
        await waDisconnect(GLOBAL_STORE_ID).catch(() => {});
        await new Promise(r => setTimeout(r, 500));
      }
      // phone field used for pairing by phone number
      const pairingPhone = body.pairingPhone || null;
      const result = await waStartSession(GLOBAL_STORE_ID, pairingPhone);
      console.log('[WA API] connect result:', JSON.stringify(result));
      return NextResponse.json({ success: true, status: result.status, qr: result.qr, pairingCode: result.pairingCode || null });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'WA server error' }, { status: 500 });
    }
  }

  if (action === 'disconnect') {
    try {
      await waDisconnect(GLOBAL_STORE_ID);
      return NextResponse.json({ success: true });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'WA server error' }, { status: 500 });
    }
  }

  if (action === 'status') {
    try {
      const result = await waGetStatus(GLOBAL_STORE_ID);
      return NextResponse.json({ success: true, status: result.status, qr: result.qr, pairingCode: result.pairingCode || null });
    } catch {
      return NextResponse.json({ success: true, status: 'server_offline', qr: null, pairingCode: null });
    }
  }

  if (action === 'toggle') {
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('whatsapp_connected')
      .eq('id', storeId)
      .single();

    const current = (store as any)?.whatsapp_connected || false;

    await (supabaseAdmin
      .from('stores')
      .update({ whatsapp_connected: !current } as any)
      .eq('id', storeId) as any);

    return NextResponse.json({ success: true, whatsapp_connected: !current });
  }

  // Test notification phone: read from app_settings and send test message
  if (action === 'test_notif_phone') {
    const { data: settingsRow } = await supabaseAdmin
      .from('app_settings' as any)
      .select('value')
      .eq('key', 'notification_phone')
      .single();
    const notifPhone = (settingsRow as any)?.value;
    if (!notifPhone) {
      return NextResponse.json({ success: false, error: 'notification_phone не сохранён в базе данных. Введите номер и нажмите Сохранить.' });
    }
    try {
      const WA_SERVER_URL = process.env.WA_SERVER_URL || 'http://localhost:3001';
      const WA_SERVER_SECRET = process.env.WA_SERVER_SECRET || 'dev-secret';
      const res = await fetch(`${WA_SERVER_URL}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': WA_SERVER_SECRET },
        body: JSON.stringify({ storeId: GLOBAL_STORE_ID, phone: notifPhone, message: `✅ Тест Metricon: уведомления об оплате настроены. Номер: ${notifPhone}` }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('WA test_notif_phone response:', res.status, JSON.stringify(data));
      const isOk = res.ok && (data.success !== false && data.error === undefined);
      if (!isOk) {
        return NextResponse.json({ success: false, error: `WA error: ${data.error || data.message || JSON.stringify(data)}`, phone: notifPhone });
      }
      return NextResponse.json({ success: true, phone: notifPhone });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `WA server: ${e.message}`, phone: notifPhone });
    }
  }

  if (action === 'logs') {
    try {
      const since = body.since || 0;
      const logs = await waGetLogs(since);
      return NextResponse.json({ success: true, logs });
    } catch {
      return NextResponse.json({ success: true, logs: [] });
    }
  }

  if (action === 'send_test') {
    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('8') ? '7' + cleanPhone.slice(1) : cleanPhone;

    // Use global session for sending — with detailed error
    try {
      const WA_SERVER_URL = process.env.WA_SERVER_URL || 'http://localhost:3001';
      const WA_SERVER_SECRET = process.env.WA_SERVER_SECRET || 'dev-secret';
      const res = await fetch(`${WA_SERVER_URL}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': WA_SERVER_SECRET },
        body: JSON.stringify({ storeId: GLOBAL_STORE_ID, phone: waPhone, message }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('WA send_test response:', res.status, JSON.stringify(data));
      if (!res.ok || data.success === false || data.error) {
        return NextResponse.json({ success: false, error: data.error || data.message || `WA ${res.status}: ${JSON.stringify(data)}` });
      }
      return NextResponse.json({ success: true });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `WA server: ${e.message}` });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
