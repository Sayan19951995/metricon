import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { kaspiScraper } from '@/lib/parser/kaspi-scraper';

// GET — get positions for all products
export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id, name')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    // Get all products
    const { data: products } = await supabase
      .from('products')
      .select('id, name, kaspi_id')
      .eq('store_id', store.id)
      .order('name');

    // Get custom keywords
    const { data: keywords } = await supabase
      .from('search_keywords')
      .select('*')
      .eq('store_id', store.id);

    // Get latest position for each product+keyword combo
    const { data: positions } = await supabase
      .from('search_positions')
      .select('*')
      .eq('store_id', store.id)
      .order('checked_at', { ascending: false });

    // Build latest positions map (product_id + keyword → latest record)
    const latestMap = new Map<string, any>();
    for (const pos of (positions || [])) {
      const key = `${pos.product_id}::${pos.keyword}`;
      if (!latestMap.has(key)) {
        latestMap.set(key, pos);
      }
    }

    // Build response
    const productList = (products || []).map(p => {
      const productKeywords = (keywords || []).filter(k => k.product_id === p.id);
      const allQueries = [
        { keyword: p.name, isCustom: false, keywordId: null },
        ...productKeywords.map(k => ({ keyword: k.keyword, isCustom: true, keywordId: k.id })),
      ];

      return {
        id: p.id,
        name: p.name,
        kaspiId: p.kaspi_id,
        queries: allQueries.map(q => {
          const latest = latestMap.get(`${p.id}::${q.keyword}`);
          return {
            keyword: q.keyword,
            isCustom: q.isCustom,
            keywordId: q.keywordId,
            positionOrganic: latest?.position_organic ?? null,
            positionAd: latest?.position_ad ?? null,
            totalResults: latest?.total_results ?? null,
            checkedAt: latest?.checked_at ?? null,
          };
        }),
      };
    });

    return NextResponse.json({
      success: true,
      storeName: store.name,
      products: productList,
    });
  } catch (error) {
    console.error('Positions GET error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// POST — check positions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, productId, checkAll } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id, name')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 400 });
    }

    // Get products to check
    let productsQuery = supabase
      .from('products')
      .select('id, name, kaspi_id')
      .eq('store_id', store.id);

    if (productId && !checkAll) {
      productsQuery = productsQuery.eq('id', productId);
    }

    const { data: products } = await productsQuery;
    if (!products || products.length === 0) {
      return NextResponse.json({ success: false, message: 'Товары не найдены' }, { status: 400 });
    }

    // Get custom keywords
    const productIds = products.map(p => p.id);
    const { data: keywords } = await supabase
      .from('search_keywords')
      .select('*')
      .in('product_id', productIds);

    const results: any[] = [];
    const allLogs: string[] = [];

    for (const product of products) {
      const productKeywords = (keywords || []).filter(k => k.product_id === product.id);
      const queries = [
        product.name,
        ...productKeywords.map(k => k.keyword),
      ];

      for (const query of queries) {
        const position = await kaspiScraper.checkPosition(query, product.kaspi_id || null);

        // Collect logs
        if (position.logs) {
          allLogs.push(...position.logs);
        }

        await supabase.from('search_positions').insert({
          store_id: store.id,
          product_id: product.id,
          keyword: query,
          position_organic: position.positionOrganic,
          position_ad: position.positionAd,
          total_results: position.totalResults,
        });

        results.push({
          productId: product.id,
          productName: product.name,
          keyword: query,
          positionOrganic: position.positionOrganic,
          positionAd: position.positionAd,
          totalResults: position.totalResults,
        });

        // Delay between requests
        if (queries.length > 1 || products.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    return NextResponse.json({ success: true, results, logs: allLogs });
  } catch (error) {
    console.error('Positions POST error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
