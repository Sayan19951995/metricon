import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { kaspiScraper } from '@/lib/parser/kaspi-scraper';

const MAX_PRODUCTS_PER_RUN = 50;
const DELAY_MS = 3000;

// GET — daily position check for all stores
export async function GET(request: NextRequest) {
  try {
    // Optional: verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get all stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name');

    if (!stores || stores.length === 0) {
      return NextResponse.json({ success: true, message: 'No stores found', checked: 0 });
    }

    let totalChecked = 0;

    for (const store of stores) {
      if (totalChecked >= MAX_PRODUCTS_PER_RUN) break;

      // Get products for this store
      const { data: products } = await supabase
        .from('products')
        .select('id, name, kaspi_id')
        .eq('store_id', store.id)
        .limit(MAX_PRODUCTS_PER_RUN - totalChecked);

      if (!products || products.length === 0) continue;

      // Get custom keywords for these products
      const productIds = products.map(p => p.id);
      const { data: keywords } = await supabase
        .from('search_keywords')
        .select('*')
        .in('product_id', productIds);

      for (const product of products) {
        if (totalChecked >= MAX_PRODUCTS_PER_RUN) break;

        const productKeywords = (keywords || []).filter(k => k.product_id === product.id);
        const queries = [
          product.name,
          ...productKeywords.map(k => k.keyword),
        ];

        for (const query of queries) {
          if (totalChecked >= MAX_PRODUCTS_PER_RUN) break;

          const position = await kaspiScraper.checkPosition(query, product.kaspi_id || null);

          await supabase.from('search_positions').insert({
            store_id: store.id,
            product_id: product.id,
            keyword: query,
            position_organic: position.positionOrganic,
            position_ad: position.positionAd,
            total_results: position.totalResults,
          });

          totalChecked++;

          // Delay between requests
          if (totalChecked < MAX_PRODUCTS_PER_RUN) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: totalChecked,
      storesProcessed: stores.length,
    });
  } catch (error) {
    console.error('Cron check-positions error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
