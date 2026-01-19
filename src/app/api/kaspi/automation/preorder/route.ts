import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../login/route';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, sku, enabled, availableFrom } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const automation = getSession(sessionId);

    if (!automation) {
      return NextResponse.json(
        { error: 'Session not found. Please login first.' },
        { status: 404 }
      );
    }

    if (!sku || enabled === undefined) {
      return NextResponse.json(
        { error: 'SKU and enabled status are required' },
        { status: 400 }
      );
    }

    const success = await automation.configurePreOrder({
      sku,
      enabled,
      availableFrom,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to configure pre-order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sku,
      enabled,
      message: `Pre-order ${enabled ? 'enabled' : 'disabled'} for product ${sku}`,
    });
  } catch (error: any) {
    console.error('Configure pre-order error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
