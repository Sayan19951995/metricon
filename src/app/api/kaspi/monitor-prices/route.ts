import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const YOUR_MERCHANT_ID = '4929016'; // Your merchant ID from scrape-products

export async function POST(request: Request) {
  try {
    const { productUrl, htmlContent } = await request.json();

    if (!productUrl || !productUrl.includes('kaspi.kz')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверная ссылка на товар. Используйте ссылку с kaspi.kz',
        },
        { status: 400 }
      );
    }

    console.log('Monitoring prices for product:', productUrl);

    let html: string;

    // Check if HTML content was provided directly
    if (htmlContent) {
      console.log('Using provided HTML content');
      html = htmlContent;
    } else {
      // Try to read from saved file
      const productId = productUrl.match(/\/p\/([^\/]+)/)?.[1] || 'product';
      const htmlPath = path.join(process.cwd(), 'docs', `kaspi-product-${productId}.html`);

      if (fs.existsSync(htmlPath)) {
        console.log('Reading HTML from saved file:', htmlPath);
        html = fs.readFileSync(htmlPath, 'utf-8');
      } else {
        // Try to fetch (may not work due to Kaspi anti-bot protection)
        console.log('Attempting to fetch HTML from URL...');
        try {
          const response = await fetch(productUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            },
          });

          if (!response.ok) {
            return NextResponse.json(
              {
                success: false,
                error: 'Не удалось загрузить страницу. Пожалуйста, сохраните HTML страницу товара.',
                instruction: `1. Откройте ${productUrl} в браузере\n2. Нажмите Ctrl+S (Cmd+S на Mac)\n3. Сохраните как "kaspi-product-${productId}.html" в папку docs\n4. Попробуйте снова`,
              },
              { status: 400 }
            );
          }

          html = await response.text();

          // Check if we got HTML or some error page
          if (!html.includes('kaspi') && !html.includes('offers')) {
            return NextResponse.json(
              {
                success: false,
                error: 'Kaspi заблокировал прямой доступ. Пожалуйста, сохраните HTML страницу товара.',
                instruction: `1. Откройте ${productUrl} в браузере\n2. Нажмите Ctrl+S (Cmd+S на Mac)\n3. Сохраните как "kaspi-product-${productId}.html" в папку docs\n4. Попробуйте снова`,
              },
              { status: 400 }
            );
          }
        } catch (fetchError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Не удалось загрузить страницу. Пожалуйста, сохраните HTML страницу товара.',
              instruction: `1. Откройте ${productUrl} в браузере\n2. Нажмите Ctrl+S (Cmd+S на Mac)\n3. Сохраните как "kaspi-product-${productId}.html" в папку docs\n4. Попробуйте снова`,
            },
            { status: 400 }
          );
        }
      }
    }

    console.log('HTML loaded, parsing...');

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Extract product name
    const productName = $('h1').first().text().trim() ||
                       $('.item__heading').first().text().trim() ||
                       'Неизвестный товар';

    console.log('Product name:', productName);

    // Find all merchant offers
    const prices: any[] = [];

    // Strategy 1: Try modern Kaspi offers structure
    console.log('Strategy 1: Looking for .offers__list items...');
    $('.offers__list .offers__item').each((index, element) => {
      const $offer = $(element);

      const merchantName = $offer.find('.offers__item-merchant-name').text().trim();
      const merchantId = $offer.attr('data-merchant-id') || `merchant_${index}`;
      const priceText = $offer.find('.offers__item-price').first().text().trim();
      const price = parseInt(priceText.replace(/\s/g, '').replace('₸', '').replace(/[^\d]/g, '')) || 0;
      const ratingText = $offer.find('.offers__item-rating').text().trim();
      const rating = parseFloat(ratingText.replace(',', '.')) || 0;
      const reviewsText = $offer.find('.offers__item-reviews').text().trim();
      const reviewsMatch = reviewsText.match(/(\d+)/);
      const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : 0;

      if (merchantName && price > 0) {
        const isCurrentMerchant = merchantId === YOUR_MERCHANT_ID;
        prices.push({
          merchantId,
          merchantName,
          price,
          rating,
          reviewsCount,
          isCurrentMerchant,
        });
        console.log(`Found offer: ${merchantName} - ${price}₸ (ID: ${merchantId})`);
      }
    });

    // Strategy 2: Try item-card structure (if on search/category page)
    if (prices.length === 0) {
      console.log('Strategy 2: Looking for .item-card elements...');
      $('.item-card').each((index, element) => {
        const $card = $(element);
        const merchantName = $card.find('.item-card__merchant, [class*="merchant"]').text().trim() || `Продавец ${index + 1}`;
        const merchantId = $card.attr('data-merchant-id') || `merchant_${index}`;
        const priceText = $card.find('.item-card__prices-price').first().text().trim();
        const price = parseInt(priceText.replace(/\s/g, '').replace('₸', '').replace(/[^\d]/g, '')) || 0;

        if (price > 0) {
          prices.push({
            merchantId,
            merchantName,
            price,
            rating: 0,
            reviewsCount: 0,
            isCurrentMerchant: merchantId === YOUR_MERCHANT_ID,
          });
          console.log(`Found card: ${merchantName} - ${price}₸`);
        }
      });
    }

    // Strategy 3: Try generic offer selectors
    if (prices.length === 0) {
      console.log('Strategy 3: Looking for generic offer structures...');
      $('[class*="offer-item"], [class*="merchant-offer"], [data-merchant-id]').each((index, element) => {
        const $offer = $(element);
        const merchantName = $offer.find('[class*="merchant"]').first().text().trim() ||
                            $offer.find('[class*="name"]').first().text().trim() ||
                            `Продавец ${index + 1}`;
        const merchantId = $offer.attr('data-merchant-id') || `merchant_${index}`;
        const priceText = $offer.find('[class*="price"]').first().text().trim();
        const price = parseInt(priceText.replace(/\s/g, '').replace('₸', '').replace(/[^\d]/g, '')) || 0;

        if (price > 0 && merchantName && merchantName !== `Продавец ${index + 1}`) {
          prices.push({
            merchantId,
            merchantName,
            price,
            rating: 0,
            reviewsCount: 0,
            isCurrentMerchant: merchantId === YOUR_MERCHANT_ID,
          });
          console.log(`Found generic: ${merchantName} - ${price}₸`);
        }
      });
    }

    // Strategy 4: Debug - show what classes are available
    if (prices.length === 0) {
      console.log('Strategy 4: Debug mode - analyzing page structure...');
      const bodyClasses = $('body').attr('class');
      const mainClasses = $('main, .main, #main').attr('class');
      console.log('Body classes:', bodyClasses);
      console.log('Main classes:', mainClasses);

      // Try to find any price-like elements
      $('[class*="price"]').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('₸')) {
          console.log(`Found price element [${i}]:`, $(el).attr('class'), '->', text);
        }
      });
    }

    console.log(`Extracted ${prices.length} competitor prices`);

    if (prices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Не удалось найти цены продавцов на этой странице. Возможно, структура страницы изменилась.',
        },
        { status: 404 }
      );
    }

    // Sort by price (lowest first)
    prices.sort((a, b) => a.price - b.price);

    // Find lowest price
    const lowestPrice = prices[0].price;

    // Find your price and position
    const yourOffer = prices.find(p => p.isCurrentMerchant);
    const yourPrice = yourOffer?.price;
    const yourPosition = yourOffer ? prices.indexOf(yourOffer) + 1 : undefined;

    // Save to database
    try {
      for (const competitor of prices) {
        await prisma.competitorPrice.create({
          data: {
            productName,
            productUrl,
            price: competitor.price,
            merchantName: competitor.merchantName,
            rating: competitor.rating,
            reviewsCount: competitor.reviewsCount,
          },
        });
      }
      console.log('Saved competitor prices to database');
    } catch (dbError) {
      console.error('Failed to save to database:', dbError);
      // Continue even if DB save fails
    }

    return NextResponse.json({
      success: true,
      message: `Найдено ${prices.length} продавцов`,
      data: {
        productName,
        productUrl,
        prices,
        lowestPrice,
        yourPrice,
        yourPosition,
      },
    });
  } catch (error: any) {
    console.error('Error monitoring prices:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Не удалось загрузить цены конкурентов',
      },
      { status: 500 }
    );
  }
}
