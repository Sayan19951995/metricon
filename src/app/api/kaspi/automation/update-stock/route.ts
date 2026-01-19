import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../login/route';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, updates } = await request.json();

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

    // Массовое обновление
    if (Array.isArray(updates)) {
      const results = await automation.bulkUpdateStock(updates);

      return NextResponse.json({
        success: true,
        results,
        message: `Updated ${results.success.length} products, failed ${results.failed.length}`,
      });
    }

    // Одиночное обновление
    const { sku, name, newStock } = updates;

    if (!sku || newStock === undefined) {
      return NextResponse.json(
        { error: 'SKU and newStock are required' },
        { status: 400 }
      );
    }

    const success = await automation.updateProductStock({
      sku,
      name: name || sku,
      newStock,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update product stock' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sku,
      newStock,
      message: 'Product stock updated successfully',
    });
  } catch (error: any) {
    console.error('Update stock error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
