import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { data: store } = await (supabaseAdmin
      .from('stores')
      .select('commission_rate, tax_rate, manager_commissions_enabled, daily_report_enabled, whatsapp_connected')
      .eq('user_id', userId)
      .single() as any);

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        commissionRate: store.commission_rate ?? 12.5,
        taxRate: store.tax_rate ?? 4.0,
        managerCommissionsEnabled: (store as any).manager_commissions_enabled ?? false,
        dailyReportEnabled: (store as any).daily_report_enabled ?? false,
        whatsappConnected: (store as any).whatsapp_connected ?? false,
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { commissionRate, taxRate, managerCommissionsEnabled, dailyReportEnabled } = body;

    const update: Record<string, any> = {};
    if (commissionRate !== undefined) update.commission_rate = commissionRate;
    if (taxRate !== undefined) update.tax_rate = taxRate;
    if (managerCommissionsEnabled !== undefined) update.manager_commissions_enabled = managerCommissionsEnabled;
    if (dailyReportEnabled !== undefined) update.daily_report_enabled = dailyReportEnabled;

    const { error } = await supabaseAdmin.from('stores')
      .update(update)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
