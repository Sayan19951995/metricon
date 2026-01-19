import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../login/route';
import { validateAndRefreshSession } from '@/lib/kaspi/session-storage';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, sku, name } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('Getting product details for SKU:', sku);

    let cookieString: string;
    let merchantId: string;
    let autoReloginPerformed = false;

    // Используем validateAndRefreshSession для автоматического обновления cookies при необходимости
    const sessionData = await validateAndRefreshSession(sessionId);

    if (sessionData) {
      console.log(
        sessionData.refreshed
          ? 'Using refreshed session cookies (auto-relogin performed)'
          : 'Using saved session cookies (no browser)'
      );
      cookieString = sessionData.cookieString;
      merchantId = sessionData.merchantId;
      autoReloginPerformed = sessionData.refreshed;
    } else {
      // Fallback: используем браузер
      const automation = getSession(sessionId);

      if (!automation) {
        return NextResponse.json(
          { success: false, error: 'Session not found or expired' },
          { status: 404 }
        );
      }

      // Получаем cookies из браузера
      const cookies = await automation['context']!.cookies();
      cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      // Извлекаем merchant ID
      await automation['page']!.goto('https://kaspi.kz/mc/', { waitUntil: 'domcontentloaded' });
      merchantId = await automation['page']!.evaluate(() => {
        const match = document.body.innerHTML.match(/merchantUid["\s:]+(\d+)/);
        return match ? match[1] : '4929016';
      });
    }

    // Получаем детали товара через API
    const detailsUrl = `https://mc.shop.kaspi.kz/bff/offer-view/details?m=${merchantId}&s=${encodeURIComponent(name)}`;

    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'Cookie': cookieString,
        'Accept': 'application/json',
        'Referer': 'https://kaspi.kz/',
      },
    });

    if (!detailsResponse.ok) {
      console.error('Failed to fetch product details:', detailsResponse.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch product details',
      });
    }

    const detailsData = await detailsResponse.json();

    // Получаем самую низкую цену через API
    let lowestPrice = null;
    let discount = null;

    if (sku) {
      const lowestPriceUrl = `https://mc.shop.kaspi.kz/offers/api/v1/price/lowest?s=${sku}`;

      const lowestPriceResponse = await fetch(lowestPriceUrl, {
        headers: {
          'Cookie': cookieString,
          'Accept': 'application/json',
          'Referer': 'https://kaspi.kz/',
        },
      });

      if (lowestPriceResponse.ok) {
        const lowestPriceData = await lowestPriceResponse.json();
        lowestPrice = lowestPriceData.lowestPrice || lowestPriceData.price;
      }
    }

    // Получаем информацию о скидках
    const discountUrl = `https://mc.shop.kaspi.kz/price/trends/api/v1/mc/discount`;

    const discountResponse = await fetch(discountUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookieString,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': 'https://kaspi.kz/',
      },
      body: JSON.stringify({
        merchantId,
        sku,
      }),
    });

    if (discountResponse.ok) {
      const discountData = await discountResponse.json();
      discount = discountData.discount;
    }

    return NextResponse.json({
      success: true,
      details: detailsData,
      lowestPrice,
      discount,
      autoReloginPerformed,
    });
  } catch (error: any) {
    console.error('Error getting product details:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get product details',
      },
      { status: 500 }
    );
  }
}
