import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

/**
 * GET /api/team/my-commission — получить свои ставки комиссии
 * Возвращает commission_offline, commission_kaspi, salary_fixed и enabled флаг
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    // Найти team_member запись по user_id
    const { data: member } = await supabaseAdmin
      .from('team_members' as any)
      .select('commission_offline, commission_kaspi, salary_fixed, store_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json({
        success: true,
        data: { enabled: false, commission_offline: 0, commission_kaspi: 0, salary_fixed: 0 },
      });
    }

    // Проверить включена ли фича у магазина
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('manager_commissions_enabled')
      .eq('id', (member as any).store_id)
      .single();

    const enabled = (store as any)?.manager_commissions_enabled ?? false;

    return NextResponse.json({
      success: true,
      data: {
        enabled,
        commission_offline: Number((member as any).commission_offline) || 0,
        commission_kaspi: Number((member as any).commission_kaspi) || 0,
        salary_fixed: Number((member as any).salary_fixed) || 0,
      },
    });
  } catch (error) {
    console.error('My commission GET error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
