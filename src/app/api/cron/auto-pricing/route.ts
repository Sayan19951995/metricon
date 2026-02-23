/**
 * Vercel Cron: автоматическая корректировка цен.
 * Запускается каждые 15 минут.
 *
 * 1. Загружает активные правила из auto_pricing_rules
 * 2. Для каждого правила пытается получить цену конкурента
 * 3. Рассчитывает новую цену по стратегии
 * 4. Обновляет цену через pricefeed API
 * 5. Записывает историю изменений
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { KaspiAPIClient, kaspiCabinetLogin } from '@/lib/kaspi/api-client';
import { extractProductId, getBestCompetitor } from '@/lib/kaspi/competitor-parser';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface KaspiSession {
  cookies: string;
  merchant_id: string;
  username?: string;
  password?: string;
}

export async function GET(req: NextRequest) {
  // Vercel Cron protection
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let checked = 0;

    // 1. Load all active rules
    const { data: rules } = await supabaseAdmin
      .from('auto_pricing_rules')
      .select('*')
      .eq('status', 'active');

    if (!rules || rules.length === 0) {
      return NextResponse.json({ success: true, message: 'No active rules', updated: 0 });
    }

    // 2. Group by store_id
    const byStore = new Map<string, typeof rules>();
    for (const rule of rules) {
      const storeRules = byStore.get(rule.store_id) || [];
      storeRules.push(rule);
      byStore.set(rule.store_id, storeRules);
    }

    // 3. Process each store
    for (const [storeId, storeRules] of byStore) {
      // Get store session
      const { data: store } = await supabaseAdmin
        .from('stores')
        .select('id, kaspi_session, kaspi_merchant_id')
        .eq('id', storeId)
        .single();

      if (!store) {
        console.log(`[Cron/AutoPricing] Store ${storeId} not found, skipping ${storeRules.length} rules`);
        skipped += storeRules.length;
        continue;
      }

      const session = store.kaspi_session as KaspiSession | null;
      if (!session?.cookies) {
        console.log(`[Cron/AutoPricing] Store ${storeId} not connected, skipping`);
        skipped += storeRules.length;
        continue;
      }

      const merchantId = session.merchant_id || store.kaspi_merchant_id || '';
      if (!merchantId) {
        skipped += storeRules.length;
        continue;
      }

      let client = new KaspiAPIClient(session.cookies, merchantId);

      // Load all products to get current prices and shopLinks
      let products;
      try {
        products = await client.getAllProducts();
      } catch (err: any) {
        if (err.message?.includes('401') && session.username && session.password) {
          // Try relogin
          const loginResult = await kaspiCabinetLogin(session.username, session.password);
          if (loginResult.success && loginResult.cookies) {
            await supabaseAdmin
              .from('stores')
              .update({
                kaspi_session: {
                  cookies: loginResult.cookies,
                  merchant_id: loginResult.merchantId || merchantId,
                  created_at: new Date().toISOString(),
                  username: session.username,
                  password: session.password,
                },
              } as any)
              .eq('id', storeId);
            client = new KaspiAPIClient(loginResult.cookies, loginResult.merchantId || merchantId);
            products = await client.getAllProducts();
          } else {
            console.error(`[Cron/AutoPricing] Relogin failed for store ${storeId}`);
            skipped += storeRules.length;
            continue;
          }
        } else {
          console.error(`[Cron/AutoPricing] Failed to load products for store ${storeId}:`, err);
          skipped += storeRules.length;
          continue;
        }
      }

      // Build product map by SKU
      const productMap = new Map<string, typeof products[0]>();
      for (const p of products) {
        productMap.set(p.sku, p);
      }

      // Process each rule
      for (const rule of storeRules) {
        checked++;
        try {
          const product = productMap.get(rule.sku);
          if (!product) {
            console.log(`[Cron/AutoPricing] SKU ${rule.sku} not found in BFF, skipping`);
            skipped++;
            continue;
          }

          const currentPrice = product.price;

          // Try to get competitor price
          let competitorPrice = rule.last_competitor_price;
          let competitorName = rule.last_competitor_name || 'Неизвестный';

          const productId = extractProductId(product.shopLink || '');
          if (productId) {
            const competitor = await getBestCompetitor(productId, merchantId);
            if (competitor) {
              competitorPrice = competitor.price;
              competitorName = competitor.merchantName;
            }
          }

          // Update last check timestamp and competitor info
          await supabaseAdmin
            .from('auto_pricing_rules')
            .update({
              last_check_at: new Date().toISOString(),
              last_competitor_price: competitorPrice,
              last_competitor_name: competitorName,
            } as any)
            .eq('id', rule.id);

          if (!competitorPrice) {
            console.log(`[Cron/AutoPricing] No competitor price for SKU ${rule.sku}, skipping`);
            skipped++;
            continue;
          }

          // Calculate new price based on strategy
          let newPrice: number;
          let reason: string;

          switch (rule.strategy) {
            case 'undercut':
              newPrice = competitorPrice - rule.step;
              reason = `Демпинг: цена снижена на ${rule.step} ₸ ниже конкурента (${competitorName})`;
              break;
            case 'match':
              newPrice = competitorPrice;
              reason = `Паритет: цена установлена равной конкуренту (${competitorName})`;
              break;
            case 'position':
              // Without real position data, use undercut as proxy
              newPrice = competitorPrice - rule.step;
              reason = `Позиция: цена скорректирована для улучшения позиции`;
              break;
            default:
              skipped++;
              continue;
          }

          // Clamp to min/max range
          newPrice = Math.max(rule.min_price, Math.min(rule.max_price, newPrice));

          // Check if we hit the floor
          if (newPrice <= rule.min_price && competitorPrice < rule.min_price) {
            await supabaseAdmin
              .from('auto_pricing_rules')
              .update({
                status: 'error',
                error_message: `Достигнут минимальный порог. Конкурент: ${competitorName} (${competitorPrice} ₸)`,
              } as any)
              .eq('id', rule.id);
            errors++;
            continue;
          }

          // If current price already optimal, skip
          if (newPrice === currentPrice) {
            skipped++;
            continue;
          }

          // If competitor is more expensive and we're undercutting, maybe raise price
          if (rule.strategy === 'undercut' && competitorPrice > currentPrice + rule.step) {
            // Raise price to be just below competitor
            newPrice = competitorPrice - rule.step;
            newPrice = Math.min(newPrice, rule.max_price);
            reason = `Оптимизация маржи: конкурент поднял цену, повышаем до ${newPrice} ₸`;
          }

          // Still same price? Skip
          if (newPrice === currentPrice) {
            skipped++;
            continue;
          }

          // Determine change type
          const changeType = newPrice < currentPrice ? 'decrease' : newPrice > currentPrice ? 'increase' : 'match';

          // Apply price change via pricefeed API
          const cityPrices = product.cityPrices?.map(cp => ({
            cityId: cp.cityId || '',
            value: newPrice,
          }));

          // If no cityPrices, create default for Almaty
          const pricesToApply = cityPrices && cityPrices.length > 0
            ? cityPrices
            : [{ cityId: '750000000', value: newPrice }];

          const availabilities = product.availabilities?.map(a => ({
            available: a.available ? 'yes' : 'no',
            storeId: a.storeId,
          })) || [];

          const updateResult = await client.updateProduct({
            sku: product.sku,
            model: product.masterSku || product.sku,
            availabilities,
            cityPrices: pricesToApply,
          });

          if (updateResult.success) {
            // Record history
            await supabaseAdmin
              .from('price_change_history')
              .insert({
                store_id: storeId,
                rule_id: rule.id,
                sku: rule.sku,
                product_name: product.name,
                change_type: changeType,
                old_price: currentPrice,
                new_price: newPrice,
                competitor_price: competitorPrice,
                competitor_name: competitorName,
                reason,
              } as any);

            // Update rule
            await supabaseAdmin
              .from('auto_pricing_rules')
              .update({
                last_price_change_at: new Date().toISOString(),
                error_message: null,
              } as any)
              .eq('id', rule.id);

            updated++;
            console.log(`[Cron/AutoPricing] ${rule.sku}: ${currentPrice} → ${newPrice} (${changeType})`);
          } else {
            console.error(`[Cron/AutoPricing] Failed to update ${rule.sku}:`, updateResult.error);
            errors++;
          }

          // Small delay between API calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (ruleErr) {
          console.error(`[Cron/AutoPricing] Error processing rule ${rule.sku}:`, ruleErr);
          errors++;
        }
      }
    }

    console.log(`[Cron/AutoPricing] Done: checked=${checked}, updated=${updated}, skipped=${skipped}, errors=${errors}`);

    return NextResponse.json({
      success: true,
      checked,
      updated,
      skipped,
      errors,
    });
  } catch (err: any) {
    console.error('[Cron/AutoPricing] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
