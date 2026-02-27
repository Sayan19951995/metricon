import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { updatePreorderOverrides, removePreorderOverrides } from '@/lib/preorder-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, skus, action, days } = body as {
      storeId: string;
      skus: string[];
      action: 'enable' | 'disable';
      days?: number;
    };

    if (!storeId || !skus || !Array.isArray(skus) || skus.length === 0 || !action) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'enable') {
      const preorderDays = Math.max(1, Math.min(30, days || 7));
      await updatePreorderOverrides(supabase, storeId, skus, preorderDays);
    } else {
      await removePreorderOverrides(supabase, storeId, skus);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Preorder API error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
