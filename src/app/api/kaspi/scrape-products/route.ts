import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const MERCHANT_ID = '4929016';

export async function POST(request: Request) {
  try {
    console.log('Starting product scraping from saved HTML file...');

    // Read the saved HTML file from docs
    const htmlPath = path.join(process.cwd(), 'docs', 'Поиск _ Kaspi Магазин.html');

    if (!fs.existsSync(htmlPath)) {
      return NextResponse.json(
        {
          success: false,
          error: 'HTML file not found. Please save the Kaspi products page as "Поиск _ Kaspi Магазин.html" in the docs folder.',
          note: 'Инструкция: Откройте https://kaspi.kz/shop/search/?q=%3AallMerchants%3A4929016 в браузере, нажмите Ctrl+S и сохраните как "Поиск _ Kaspi Магазин.html" в папку docs'
        },
        { status: 404 }
      );
    }

    const html = fs.readFileSync(htmlPath, 'utf-8');
    console.log('HTML file loaded, parsing...');

    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    const products: any[] = [];

    // Find all product cards
    $('.item-card').each((index, element) => {
      const $card = $(element);

      // Extract product data
      const productId = $card.attr('data-product-id');
      const nameLink = $card.find('.item-card__name-link');
      const name = nameLink.text().trim();
      const url = nameLink.attr('href');

      // Extract price
      const priceText = $card.find('.item-card__prices-price').first().text().trim();
      const price = parseInt(priceText.replace(/\s/g, '').replace('₸', '')) || 0;

      // Extract image
      const image = $card.find('.item-card__image').attr('src');

      // Extract rating
      const reviewsText = $card.find('.item-card__rating a').text().trim();
      const reviewsMatch = reviewsText.match(/\((\d+)/);
      const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : 0;

      if (productId && name) {
        products.push({
          kaspiId: productId,
          sku: productId,
          name: name,
          price: price,
          availableAmount: 0, // Not available from scraping
          categoryId: '',
          images: image ? [image] : [],
          attributes: {
            url: url ? `https://kaspi.kz${url}` : '',
            reviewsCount: reviewsCount,
          },
        });
      }
    });

    console.log(`Extracted ${products.length} products from HTML`);

    if (products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No products found. The page structure might have changed or products are loaded dynamically.'
        },
        { status: 404 }
      );
    }

    // Save products to database
    let syncedProducts = 0;
    for (const product of products) {
      try {
        await prisma.product.upsert({
          where: { sku: product.sku },
          update: {
            name: product.name,
            price: product.price,
            images: product.images,
            attributes: product.attributes,
            syncedAt: new Date(),
          },
          create: product,
        });
        syncedProducts++;
      } catch (error) {
        console.error(`Failed to sync product ${product.sku}:`, error);
      }
    }

    console.log(`Synced ${syncedProducts} products to database`);

    return NextResponse.json({
      success: true,
      message: `Scraped ${products.length} products from Kaspi.kz`,
      data: {
        totalProducts: products.length,
        syncedProducts: syncedProducts,
        merchantId: MERCHANT_ID,
        products: products,
      },
    });
  } catch (error: any) {
    console.error('Error scraping products:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to scrape products from Kaspi.kz',
      },
      { status: 500 }
    );
  }
}
