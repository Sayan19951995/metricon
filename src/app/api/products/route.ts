import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '0');
    const size = parseInt(searchParams.get('size') || '100');

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
            { categoryId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get total count
    const totalElements = await prisma.product.count({ where });

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: {
        syncedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      products: products,
      pagination: {
        page,
        size,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
      },
    });
  } catch (error: any) {
    console.error('Error fetching products from database:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch products from database',
      },
      { status: 500 }
    );
  }
}
