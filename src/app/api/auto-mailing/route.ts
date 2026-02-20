import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { requireRole } from '@/lib/api-auth';

// GET — получить все шаблоны рассылок + настройки магазина
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

    const { data: templates, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('store_id', auth.store.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Получаем настройки рассылки из stores
    const { data: store } = await supabase
      .from('stores')
      .select('mailing_settings')
      .eq('id', auth.store.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        templates: templates || [],
        settings: (store as any)?.mailing_settings || {},
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// POST — создать новый шаблон рассылки
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, triggerType, subject, template, status } = body;

    if (!userId || !name || !triggerType) {
      return NextResponse.json({ success: false, message: 'userId, name, triggerType обязательны' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        store_id: auth.store.id,
        name,
        trigger_type: triggerType,
        subject: subject || null,
        template_ru: template || null,
        status: status || 'draft',
        active: status === 'active',
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// PUT — обновить шаблон или настройки
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, id, name, triggerType, subject, template, status, settings } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    // Если передали settings — обновляем настройки магазина
    if (settings) {
      const { error } = await supabase
        .from('stores')
        .update({ mailing_settings: settings } as any)
        .eq('id', auth.store.id);

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Иначе обновляем шаблон
    if (!id) {
      return NextResponse.json({ success: false, message: 'id обязателен' }, { status: 400 });
    }

    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (triggerType !== undefined) update.trigger_type = triggerType;
    if (subject !== undefined) update.subject = subject;
    if (template !== undefined) update.template_ru = template;
    if (status !== undefined) {
      update.status = status;
      update.active = status === 'active';
    }

    const { data, error } = await supabase
      .from('message_templates')
      .update(update)
      .eq('id', id)
      .eq('store_id', auth.store.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// DELETE — удалить шаблон
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (!userId || !id) {
      return NextResponse.json({ success: false, message: 'userId и id обязательны' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id)
      .eq('store_id', auth.store.id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
