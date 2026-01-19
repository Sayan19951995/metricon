import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../login/route';
import { validateAndRefreshSession } from '@/lib/kaspi/session-storage';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, sku, name, price, stock } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!sku || !name) {
      return NextResponse.json(
        { success: false, error: 'SKU and name are required' },
        { status: 400 }
      );
    }

    if (price === undefined || stock === undefined) {
      return NextResponse.json(
        { success: false, error: 'Price and stock are required' },
        { status: 400 }
      );
    }

    console.log('Updating price for SKU:', sku, 'to', price, 'stock:', stock);

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
      console.log('Using browser-based session');
      const automation = getSession(sessionId);

      if (!automation) {
        return NextResponse.json(
          { success: false, error: 'Session not found. Please login first.' },
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

    // Получаем детали товара чтобы узнать masterSku
    const detailsUrl = `https://mc.shop.kaspi.kz/bff/offer-view/details?m=${merchantId}&s=${encodeURIComponent(name)}`;

    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'Cookie': cookieString,
        'Accept': 'application/json',
        'Referer': 'https://kaspi.kz/',
      },
    });

    let masterSku = sku; // По умолчанию используем обычный SKU
    let availabilities: any[] = [];

    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json();
      console.log('Product details:', detailsData);

      if (detailsData.masterSku) {
        masterSku = detailsData.masterSku;
      }

      // Получаем информацию о складах
      if (detailsData.availabilities && Array.isArray(detailsData.availabilities)) {
        // Распределяем остаток по всем складам
        const totalStores = detailsData.availabilities.length;
        const stockPerStore = Math.floor(stock / totalStores);
        const remainder = stock % totalStores;

        availabilities = detailsData.availabilities.map((avail: any, index: number) => ({
          available: stock > 0 ? 'yes' : 'no',
          storeId: avail.storeId || `${merchantId}_PP${index + 1}`,
          stockCount: index === 0 ? stockPerStore + remainder : stockPerStore,
        }));
      }
    }

    // Если не удалось получить склады, создаем дефолтные
    if (availabilities.length === 0) {
      availabilities = [
        {
          available: stock > 0 ? 'yes' : 'no',
          storeId: `${merchantId}_PP1`,
          stockCount: stock,
        },
      ];
    }

    console.log('Master SKU:', masterSku);
    console.log('Availabilities:', availabilities);

    // Шаг 1: Валидация товара перед обновлением
    const validateUrl = 'https://mc.shop.kaspi.kz/offer-validation-api/merchant/offer/validate';

    const validatePayload = {
      checkType: 'FULL',
      merchantUid: merchantId,
      offers: [
        {
          masterSku: masterSku,
        },
      ],
    };

    console.log('Validating product:', validatePayload);

    const validateResponse = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookieString,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': 'https://kaspi.kz/',
        'Origin': 'https://kaspi.kz',
      },
      body: JSON.stringify(validatePayload),
    });

    if (!validateResponse.ok) {
      console.error('Validation failed:', validateResponse.status);
      const errorText = await validateResponse.text();
      console.error('Validation error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Validation failed: ' + errorText,
      });
    }

    const validateData = await validateResponse.json();
    console.log('Validation result:', validateData);

    // Шаг 2: Обновление цены через API
    const updateUrl = 'https://mc.shop.kaspi.kz/pricefeed/upload/merchant/process';

    const updatePayload = {
      merchantUid: merchantId,
      model: name,
      sku: sku,
      cityPrices: [
        {
          cityId: '750000000', // Алматы
          value: price,
        },
      ],
      availabilities: availabilities,
    };

    console.log('Updating product:', updatePayload);

    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookieString,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': 'https://kaspi.kz/',
        'Origin': 'https://kaspi.kz',
        'X-Auth-Version': '2',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      console.error('Update failed:', updateResponse.status);
      const errorText = await updateResponse.text();
      console.error('Update error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Update failed: ' + errorText,
      });
    }

    const updateData = await updateResponse.json();
    console.log('Update result:', JSON.stringify(updateData, null, 2));

    // Kaspi API возвращает успешный результат даже если status 200
    // Проверяем разные возможные форматы ответа
    const isSuccess =
      updateData.success === true ||
      updateData.status === 'success' ||
      updateData.status === 'SUCCESS' ||
      updateResponse.status === 200;

    if (isSuccess) {
      return NextResponse.json({
        success: true,
        sku,
        price,
        stock,
        message: 'Цена и остаток успешно обновлены',
        autoReloginPerformed,
        debug: updateData, // Добавляем debug info
      });
    } else {
      return NextResponse.json({
        success: false,
        error: updateData.message || updateData.error || 'Update failed',
        debug: updateData, // Добавляем debug info
      });
    }
  } catch (error: any) {
    console.error('Update price error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
