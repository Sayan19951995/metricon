import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../login/route';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, product } = await request.json();

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

    const { name, description, price, stock, category, images, sku } = product;

    if (!name || !price || stock === undefined) {
      return NextResponse.json(
        { error: 'Name, price, and stock are required' },
        { status: 400 }
      );
    }

    const success = await automation.addNewProduct({
      name,
      description: description || '',
      price,
      stock,
      category: category || '',
      images: images || [],
      sku,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add product' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: { name, sku },
      message: 'Product added successfully',
    });
  } catch (error: any) {
    console.error('Add product error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
