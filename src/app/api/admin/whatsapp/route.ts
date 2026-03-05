import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { waSendMessage } from '@/lib/whatsapp/client';

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

/**
 * GET /api/admin/whatsapp
 * List all stores with WhatsApp status and owner info
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { data: stores } = await (supabaseAdmin
    .from('stores')
    .select('id, name, user_id, kaspi_merchant_id, whatsapp_connected')
    .order('name') as any);

  if (!stores) {
    return NextResponse.json({ stores: [] });
  }

  // Enrich with user info
  const userIds = [...new Set(stores.map((s: any) => s.user_id).filter(Boolean))];
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, email, phone')
    .in('id', userIds);

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

  return NextResponse.json({ stores: enriched });
}

/**
 * PATCH /api/admin/whatsapp
 * Toggle whatsapp_connected or send test message
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { action, storeId, phone, message } = await request.json();

  if (action === 'toggle') {
    // Get current value
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('whatsapp_connected')
      .eq('id', storeId)
      .single();

    const current = (store as any)?.whatsapp_connected || false;

    const { error } = await (supabaseAdmin
      .from('stores')
      .update({ whatsapp_connected: !current } as any)
      .eq('id', storeId) as any);

    if (error) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, whatsapp_connected: !current });
  }

  if (action === 'send_test') {
    if (!storeId || !phone || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('8') ? '7' + cleanPhone.slice(1) : cleanPhone;

    const ok = await waSendMessage(storeId, waPhone, message);
    return NextResponse.json({ success: ok });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
