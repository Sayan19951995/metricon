import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ provider: null });
    }

    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const user = data?.users?.find(u => u.email === email);

    if (!user) {
      return NextResponse.json({ provider: null });
    }

    // Check if user has only Google (no password)
    const providers = user.app_metadata?.providers || [];
    const hasGoogle = providers.includes('google');
    const hasEmail = providers.includes('email');

    if (hasGoogle && !hasEmail) {
      return NextResponse.json({ provider: 'google' });
    }

    return NextResponse.json({ provider: null });
  } catch {
    return NextResponse.json({ provider: null });
  }
}
