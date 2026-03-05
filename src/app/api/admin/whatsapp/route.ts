import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { waSendMessage, waStartSession, waGetStatus, waDisconnect } from '@/lib/whatsapp/client';

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
  try {
    const result = await waGetStatus(GLOBAL_STORE_ID);
    waStatus = result.status;
    waQr = result.qr;
  } catch {
    waStatus = 'server_offline';
  }

  const { data: stores } = await (supabaseAdmin
    .from('stores')
    .select('id, name, user_id, kaspi_merchant_id, whatsapp_connected')
    .order('name') as any);

  if (!stores) {
    return NextResponse.json({ stores: [], waStatus, waQr });
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

  return NextResponse.json({ stores: enriched, waStatus, waQr });
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

  if (action === 'connect') {
    try {
      const result = await waStartSession(GLOBAL_STORE_ID);
      return NextResponse.json({ success: true, status: result.status, qr: result.qr });
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
      return NextResponse.json({ success: true, status: result.status, qr: result.qr });
    } catch {
      return NextResponse.json({ success: true, status: 'server_offline', qr: null });
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

  if (action === 'send_test') {
    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('8') ? '7' + cleanPhone.slice(1) : cleanPhone;

    // Use global session for sending
    const ok = await waSendMessage(GLOBAL_STORE_ID, waPhone, message);
    return NextResponse.json({ success: ok });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
