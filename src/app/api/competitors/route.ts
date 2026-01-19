import { NextResponse } from 'next/server';
import { kaspiScraper } from '@/lib/parser/kaspi-scraper';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const { productName, limit } = await request.json();

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    const competitors = await kaspiScraper.comparePrices(
      productName,
      limit || 10
    );

    // Save to database
    for (const competitor of competitors) {
      await prisma.competitorPrice.create({
        data: {
          productName: competitor.productName,
          productUrl: competitor.url,
          price: competitor.price,
          merchantName: competitor.merchantName,
          rating: competitor.rating,
          reviewsCount: competitor.reviewsCount,
        },
      });
    }

    return NextResponse.json({
      success: true,
      competitors,
    });
  } catch (error) {
    console.error('Error scraping competitors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor data' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get('productName');

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    const competitors = await prisma.competitorPrice.findMany({
      where: {
        productName: {
          contains: productName,
          mode: 'insensitive',
        },
      },
      orderBy: {
        scrapedAt: 'desc',
      },
      take: 20,
    });

    // Group by merchant and get latest prices
    const latestPrices = competitors.reduce((acc, comp) => {
      const key = `${comp.merchantName}-${comp.productUrl}`;
      if (!acc[key] || acc[key].scrapedAt < comp.scrapedAt) {
        acc[key] = comp;
      }
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      competitors: Object.values(latestPrices).sort((a, b) => a.price - b.price),
    });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor data' },
      { status: 500 }
    );
  }
}
