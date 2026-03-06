import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth;
  const { data } = await supabaseAdmin.from('users').select('is_admin').eq('id', auth.user.id).single();
  if (!(data as any)?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}

/** GET /api/admin/settings */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  const { data } = await supabaseAdmin
    .from('app_settings' as any)
    .select('key, value');

  const settings: Record<string, string> = {};
  for (const row of (data || []) as any[]) {
    settings[row.key] = row.value || '';
  }

  return NextResponse.json({ success: true, settings });
}

/** PATCH /api/admin/settings */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    await supabaseAdmin
      .from('app_settings' as any)
      .upsert({ key, value, updated_at: new Date().toISOString() });
  }

  return NextResponse.json({ success: true });
}
