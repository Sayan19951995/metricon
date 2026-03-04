import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { KaspiMarketingClient, MarketingSession, MarketingCampaign } from '@/lib/kaspi/marketing-client';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const storeResult = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    const store = storeResult.data;
    if (!store) {
      return NextResponse.json({
        success: false,
        message: 'Магазин не найден'
      }, { status: 400 });
    }

    // Ставки из настроек магазина
    const commissionRate = (store.commission_rate ?? 12.5) as number;
    const taxRate = (store.tax_rate ?? 4.0) as number;

    // === 0. Параллельная загрузка: товары, группы, заказы, опер. расходы ===
    const [productsResult, groupsResult, completedOrdersResult, opExpensesResult] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select('id, kaspi_id, sku, name, cost_price, product_group, image_url')
        .eq('store_id', store.id),
      supabaseAdmin
        .from('product_groups')
        .select('slug, name, color')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('orders')
        .select('total_amount, completed_at, status, delivery_cost, delivery_mode, delivery_address, items, confirmed_by, sale_source' as string)
        .eq('store_id', store.id)
        .not('completed_at', 'is', null)
        .eq('status', 'completed')
        .order('completed_at', { ascending: true }),
      supabaseAdmin
        .from('operational_expenses')
        .select('*')
        .eq('store_id', store.id),
    ]);

    const productsDb = productsResult.data || [];
    const productGroupsMeta = groupsResult.data || [];

    const costPriceMap = new Map<string, number>();
    const groupMap = new Map<string, string>();
    const imageMap = new Map<string, string>();

    for (const p of productsDb) {
      if (p.kaspi_id && p.cost_price) {
        costPriceMap.set(p.kaspi_id, Number(p.cost_price));
      }
      if (p.kaspi_id && p.image_url) imageMap.set(p.kaspi_id, p.image_url);
      if (p.sku && p.image_url) imageMap.set(p.sku, p.image_url);
      if (p.name && p.image_url) imageMap.set(p.name, p.image_url);
      if (p.kaspi_id && p.product_group) {
        groupMap.set(p.kaspi_id, p.product_group);
      }
    }

    // Если фото нет ни у одного товара — подтянуть из Kaspi Cabinet (не блокируем ответ)
    if (imageMap.size === 0 && productsDb.length > 0) {
      const session = (store as any).kaspi_session as { cookies?: string; merchant_id?: string } | null;
      if (session?.cookies && (session.merchant_id || store.kaspi_merchant_id)) {
        const merchantId = session.merchant_id || store.kaspi_merchant_id || '';
        const client = new KaspiAPIClient(session.cookies, merchantId);
        // Fire and forget — не ждём, фото подтянутся при следующей загрузке
        client.getAllProducts().then(cabinetProducts => {
          const cabBySku = new Map<string, string>();
          const cabByName = new Map<string, string>();
          for (const kp of cabinetProducts) {
            const img = kp.images?.[0];
            if (!img) continue;
            if (kp.sku) cabBySku.set(kp.sku, img);
            if (kp.name) cabByName.set(kp.name.toLowerCase().trim(), img);
          }
          for (const p of productsDb) {
            const img = (p.sku && cabBySku.get(p.sku))
              || (p.name && cabByName.get(p.name.toLowerCase().trim()))
              || null;
            if (img) {
              supabaseAdmin.from('products').update({ image_url: img } as any).eq('id', p.id).then(() => {});
            }
          }
        }).catch(() => {});
      }
    }

    // === 1. Поступления по дате выдачи (completed_at) ===
    // completedOrdersResult уже загружен в Promise.all выше
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedOrders = (completedOrdersResult.data || []) as any[];

    // Группируем по дате completed_at в UTC+5 (Казахстан)
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    interface DayAgg {
      revenue: number;
      count: number;
      commission: number;
      tax: number;
      delivery: number;
      costPrice: number;
      deliveryModes: Record<string, number>;
    }

    const paymentsByDate = new Map<string, DayAgg>();
    // Per-day product sales for period filtering
    const productsByDate = new Map<string, Map<string, { name: string; qty: number; revenue: number; costPrice: number }>>();
    for (const order of (completedOrders || [])) {
      if (!order.completed_at) continue;
      const utcMs = new Date(order.completed_at).getTime();
      const kzDate = new Date(utcMs + 5 * 3600000).toISOString().split('T')[0];

      const amount = order.total_amount || 0;
      const orderCommission = amount * (commissionRate / 100);
      const orderTax = amount * (taxRate / 100);
      const orderDelivery = Number(order.delivery_cost) || 0;

      // Себестоимость из items
      let orderCost = 0;
      const items = order.items as Array<{ product_code: string; product_name: string; quantity: number; total: number }> | null;
      if (items) {
        if (!productsByDate.has(kzDate)) productsByDate.set(kzDate, new Map());
        const dayProds = productsByDate.get(kzDate)!;
        for (const item of items) {
          const cp = costPriceMap.get(item.product_code);
          if (cp) orderCost += cp * (item.quantity || 1);
          // Track per-day product sales
          const code = item.product_code || item.product_name;
          const existing2 = dayProds.get(code);
          if (existing2) {
            existing2.qty += item.quantity || 1;
            existing2.revenue += item.total || 0;
            existing2.costPrice += (cp || 0) * (item.quantity || 1);
          } else {
            dayProds.set(code, {
              name: item.product_name,
              qty: item.quantity || 1,
              revenue: item.total || 0,
              costPrice: (cp || 0) * (item.quantity || 1),
            });
          }
        }
      }

      const mode = order.delivery_mode || 'unknown';

      const existing = paymentsByDate.get(kzDate);
      if (existing) {
        existing.revenue += amount;
        existing.count += 1;
        existing.commission += orderCommission;
        existing.tax += orderTax;
        existing.delivery += orderDelivery;
        existing.costPrice += orderCost;
        existing.deliveryModes[mode] = (existing.deliveryModes[mode] || 0) + 1;
      } else {
        paymentsByDate.set(kzDate, {
          revenue: amount,
          count: 1,
          commission: orderCommission,
          tax: orderTax,
          delivery: orderDelivery,
          costPrice: orderCost,
          deliveryModes: { [mode]: 1 },
        });
      }
    }

    // === 1b. Операционные расходы — разбить по дням ===
    const opExpenses = opExpensesResult.data || [];

    // Для каждого дня подсчитаем долю опер. расходов
    const dailyOpex = new Map<string, number>();
    for (const exp of (opExpenses || [])) {
      const start = new Date(exp.start_date);
      const end = new Date(exp.end_date);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
      const perDay = Number(exp.amount) / days;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        dailyOpex.set(key, (dailyOpex.get(key) || 0) + perDay);
      }
    }

    // Формируем dailyData
    const dailyData = Array.from(paymentsByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, agg]) => {
        const d = new Date(dateStr + 'T12:00:00');
        const dayOfWeek = d.getDay();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const opex = dailyOpex.get(dateStr) || 0;
        const totalExpenses = agg.costPrice + agg.commission + agg.tax + agg.delivery + opex;
        return {
          date: `${dd}.${mm}`,
          fullDate: dateStr + 'T12:00:00',
          day: dayNames[dayOfWeek],
          orders: agg.count,
          revenue: agg.revenue,
          cost: agg.costPrice,
          advertising: 0, // заполнится ниже из маркетинга
          commissions: agg.commission,
          tax: agg.tax,
          delivery: agg.delivery,
          operational: opex,
          profit: agg.revenue - totalExpenses,
          products: Array.from((productsByDate.get(dateStr) || new Map()).entries()).map(([code, pd]) => ({
            code, name: pd.name, qty: pd.qty, revenue: pd.revenue, costPrice: pd.costPrice,
          })),
        };
      });

    // === 2. Топ товары — из выданных заказов (completed) ===
    const productSales = new Map<string, { name: string; sold: number; revenue: number; costPrice: number }>();

    for (const order of (completedOrders || [])) {
      const items = order.items as Array<{
        product_code: string;
        product_name: string;
        quantity: number;
        price: number;
        total: number;
      }> | null;

      if (items && Array.isArray(items)) {
        for (const item of items) {
          const key = item.product_code || item.product_name;
          const cp = costPriceMap.get(item.product_code) || 0;
          const existing = productSales.get(key);
          if (existing) {
            existing.sold += item.quantity;
            existing.revenue += item.total;
            existing.costPrice += cp * (item.quantity || 1);
          } else {
            productSales.set(key, {
              name: item.product_name,
              sold: item.quantity,
              revenue: item.total,
              costPrice: cp * (item.quantity || 1),
            });
          }
        }
      }
    }

    // === 2b. Параллельная загрузка: доп. запросы заказов + опер. расходы ===
    const [allOrdersResult, returnedOrdersByCreationResult, ordersByStatusResult, activeOrdersResult, returnedOrdersResult] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('items, total_amount, status, created_at, delivery_cost')
        .eq('store_id', store.id)
        .not('status', 'in', '(cancelled,returned)'),
      supabaseAdmin
        .from('orders')
        .select('created_at')
        .eq('store_id', store.id)
        .eq('status', 'returned'),
      supabaseAdmin
        .from('orders')
        .select('status')
        .eq('store_id', store.id),
      supabaseAdmin
        .from('orders')
        .select('kaspi_order_id, customer_name, delivery_address, total_amount, created_at, items, status')
        .eq('store_id', store.id)
        .not('status', 'in', `(completed,delivered,cancelled,returned,archive)`)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('orders')
        .select('kaspi_order_id, customer_name, total_amount, created_at, items')
        .eq('store_id', store.id)
        .eq('status', 'returned')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const allOrders = allOrdersResult.data || [];

    const ordersByCreationDate = new Map<string, { revenue: number; count: number; commission: number; tax: number; delivery: number; costPrice: number }>();
    const productsByCreationDate = new Map<string, Map<string, { name: string; qty: number; revenue: number; costPrice: number }>>();
    for (const order of (allOrders || [])) {
      if (!order.created_at) continue;
      const utcMs = new Date(order.created_at).getTime();
      const kzDate = new Date(utcMs + 5 * 3600000).toISOString().split('T')[0];
      const amount = order.total_amount || 0;

      let orderCost = 0;
      const items = order.items as Array<{ product_code: string; product_name: string; quantity: number; total: number }> | null;
      if (items) {
        if (!productsByCreationDate.has(kzDate)) productsByCreationDate.set(kzDate, new Map());
        const dayProds = productsByCreationDate.get(kzDate)!;
        for (const item of items) {
          const cp = costPriceMap.get(item.product_code);
          if (cp) orderCost += cp * (item.quantity || 1);
          const code = item.product_code || item.product_name;
          const ex = dayProds.get(code);
          if (ex) {
            ex.qty += item.quantity || 1;
            ex.revenue += item.total || 0;
            ex.costPrice += (cp || 0) * (item.quantity || 1);
          } else {
            dayProds.set(code, {
              name: item.product_name,
              qty: item.quantity || 1,
              revenue: item.total || 0,
              costPrice: (cp || 0) * (item.quantity || 1),
            });
          }
        }
      }

      const existing = ordersByCreationDate.get(kzDate);
      if (existing) {
        existing.revenue += amount;
        existing.count += 1;
        existing.commission += amount * (commissionRate / 100);
        existing.tax += amount * (taxRate / 100);
        existing.delivery += Number(order.delivery_cost) || 0;
        existing.costPrice += orderCost;
      } else {
        ordersByCreationDate.set(kzDate, {
          revenue: amount,
          count: 1,
          commission: amount * (commissionRate / 100),
          tax: amount * (taxRate / 100),
          delivery: Number(order.delivery_cost) || 0,
          costPrice: orderCost,
        });
      }
    }


    // Возвраты по дате создания (для карточки "Возвраты" с фильтром по периоду)
    // returnedOrdersByCreationResult уже загружен в Promise.all выше
    const returnedOrdersByCreation = returnedOrdersByCreationResult.data || [];

    const returnedByCreationDate = new Map<string, number>();
    for (const order of returnedOrdersByCreation) {
      if (!order.created_at) continue;
      const utcMs = new Date(order.created_at).getTime();
      const kzDate = new Date(utcMs + 5 * 3600000).toISOString().split('T')[0];
      returnedByCreationDate.set(kzDate, (returnedByCreationDate.get(kzDate) || 0) + 1);
    }

    // Добавляем даты, на которых есть только возвраты (нет других заказов)
    for (const [dateStr] of returnedByCreationDate) {
      if (!ordersByCreationDate.has(dateStr)) {
        ordersByCreationDate.set(dateStr, { revenue: 0, count: 0, commission: 0, tax: 0, delivery: 0, costPrice: 0 });
      }
    }

    const dailyDataByCreation = Array.from(ordersByCreationDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, agg]) => {
        const d = new Date(dateStr + 'T12:00:00');
        const dayOfWeek = d.getDay();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const opex = dailyOpex.get(dateStr) || 0;
        const totalExpenses = agg.costPrice + agg.commission + agg.tax + agg.delivery + opex;
        return {
          date: `${dd}.${mm}`,
          fullDate: dateStr + 'T12:00:00',
          day: dayNames[dayOfWeek],
          orders: agg.count,
          revenue: agg.revenue,
          cost: agg.costPrice,
          advertising: 0,
          commissions: agg.commission,
          tax: agg.tax,
          delivery: agg.delivery,
          operational: opex,
          profit: agg.revenue - totalExpenses,
          returned: returnedByCreationDate.get(dateStr) || 0,
          products: Array.from((productsByCreationDate.get(dateStr) || new Map()).entries()).map(([code, pd]) => ({
            code, name: pd.name, qty: pd.qty, revenue: pd.revenue, costPrice: pd.costPrice,
          })),
        };
      });

    // === 3. Статусы заказов ===
    // ordersByStatusResult уже загружен в Promise.all выше
    const ordersByStatusRaw = ordersByStatusResult.data || [];

    const statusCounts: Record<string, number> = {};
    for (const o of (ordersByStatusRaw || [])) {
      const s = o.status || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const pending = (statusCounts['new'] || 0) + (statusCounts['pending'] || 0);
    const processing = (statusCounts['kaspi_delivery_awaiting'] || 0) +
                       (statusCounts['kaspi_delivery_packing'] || 0) +
                       (statusCounts['kaspi_delivery_preorder'] || 0) +
                       (statusCounts['sign_required'] || 0);
    const shipped = (statusCounts['delivery'] || 0) +
                    (statusCounts['kaspi_delivery_transfer'] || 0) +
                    (statusCounts['kaspi_delivery_transmitted'] || 0) +
                    (statusCounts['pickup'] || 0);
    const delivered = (statusCounts['completed'] || 0) + (statusCounts['delivered'] || 0);
    const cancelled = (statusCounts['cancelled'] || 0);
    const returned = (statusCounts['returned'] || 0);

    // === 4. Активные заказы ===
    // activeOrdersResult уже загружен в Promise.all выше
    const activeOrdersRaw = activeOrdersResult.data || [];

    const activeOrders = activeOrdersRaw || [];
    const pendingOrdersList = activeOrders.slice(0, 20).map(o => {
      const items = o.items as Array<{ product_name: string }> | null;
      const productName = items && items.length > 0 ? items[0].product_name : 'Товар';
      return {
        id: o.kaspi_order_id,
        product: productName,
        amount: o.total_amount,
        date: o.created_at ? o.created_at.split('T')[0] : '',
        customer: o.delivery_address || o.customer_name || '',
      };
    });

    // === 5. Возвратные заказы ===
    // returnedOrdersResult уже загружен в Promise.all выше
    const returnedOrdersRaw = returnedOrdersResult.data || [];

    const returnedOrders = (returnedOrdersRaw || []).map(o => {
      const items = o.items as Array<{ product_name: string; quantity: number; price: number }> | null;
      const productName = items && items.length > 0 ? items[0].product_name : 'Товар';
      const itemsCount = items ? items.reduce((sum, i) => sum + (i.quantity || 1), 0) : 1;
      return {
        id: o.kaspi_order_id,
        product: productName,
        itemsCount,
        amount: o.total_amount,
        date: o.created_at ? o.created_at.split('T')[0] : '',
        customer: o.customer_name || '',
      };
    });

    // === 6. Маркетинговые данные из Kaspi Marketing ===
    let totalAdvertising = 0;
    let adTransactions = 0;
    let adGmv = 0;
    let marketingCampaigns: Array<{ id: number; name: string; cost: number; views: number; clicks: number; transactions: number; gmv: number; state: string }> = [];
    const adCostBySku = new Map<string, number>();

    if (store.marketing_session) {
      try {
        let session = store.marketing_session as unknown as MarketingSession;
        let client = new KaspiMarketingClient(session);

        // Последние 30 дней — берём данные из Kaspi Marketing как есть
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const endDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const d30 = new Date(now.getTime() - 30 * 86400000);
        const startDate = `${d30.getFullYear()}-${pad(d30.getMonth() + 1)}-${pad(d30.getDate())}`;

        // Пробуем получить кампании, при ошибке — авто-переподключение
        let campaigns: MarketingCampaign[];
        try {
          campaigns = await client.getCampaigns(startDate, endDate);
        } catch {
          console.log('[Analytics] Marketing session expired, reconnecting...');
          const newSession = await KaspiMarketingClient.tryReconnect(session);
          if (newSession) {
            await supabaseAdmin.from('stores')
              .update({ marketing_session: JSON.parse(JSON.stringify(newSession)) })
              .eq('id', store.id);
            client = new KaspiMarketingClient(newSession);
            campaigns = await client.getCampaigns(startDate, endDate);
            console.log('[Analytics] Marketing reconnected');
          } else {
            console.error('[Analytics] Marketing reconnect failed — no credentials');
            campaigns = [];
          }
        }

        const summary = KaspiMarketingClient.aggregateCampaigns(campaigns);

        totalAdvertising = summary.totalCost;
        adTransactions = summary.totalTransactions;
        adGmv = summary.totalGmv;
        marketingCampaigns = campaigns
          .filter(c => c.cost > 0 || c.state === 'Enabled')
          .map(c => ({
            id: c.id,
            name: c.name,
            cost: c.cost,
            views: c.views,
            clicks: c.clicks,
            transactions: c.transactions,
            gmv: c.gmv,
            state: c.state,
          }));

        // Собираем рекламные расходы по SKU (из товаров кампаний)
        for (const campaign of campaigns) {
          if (campaign.cost <= 0) continue;
          try {
            const products = await client.getCampaignProducts(campaign.id, startDate, endDate);
            console.log(`[Analytics] Campaign ${campaign.id} "${campaign.name}": ${products.length} products, cost=${campaign.cost}`);
            for (const p of products) {
              if (p.cost > 0 && p.sku) {
                adCostBySku.set(p.sku, (adCostBySku.get(p.sku) || 0) + p.cost);
              }
            }
          } catch (e) {
            console.error(`[Analytics] Failed to get products for campaign ${campaign.id}:`, e);
          }
        }
        console.log(`[Analytics] adCostBySku size: ${adCostBySku.size}, adTransactions: ${adTransactions}, totalOrders will be calculated next`);
      } catch (err) {
        console.error('Failed to fetch marketing data:', err);
      }
    }

    // Распределяем рекламу по дням пропорционально выручке
    const totalRevenueForAds = dailyData.reduce((sum, d) => sum + d.revenue, 0);
    if (totalAdvertising > 0 && totalRevenueForAds > 0) {
      for (const day of dailyData) {
        const share = day.revenue / totalRevenueForAds;
        day.advertising = totalAdvertising * share;
        day.profit -= day.advertising;
      }
    }

    // === 6b. Агрегация способов доставки ===
    const deliveryModeCounts: Record<string, number> = {};
    for (const [, agg] of paymentsByDate) {
      for (const [mode, count] of Object.entries(agg.deliveryModes)) {
        deliveryModeCounts[mode] = (deliveryModeCounts[mode] || 0) + count;
      }
    }

    // Маппинг в удобные ключи
    const kaspiDelivery = (deliveryModeCounts['KASPI_DELIVERY'] || 0) + (deliveryModeCounts['DELIVERY_LOCAL'] || 0);
    const regional = deliveryModeCounts['DELIVERY_REGIONAL_TODOOR'] || 0;
    const express = deliveryModeCounts['DELIVERY_EXPRESS'] || 0;
    const sellerDelivery = deliveryModeCounts['DELIVERY'] || 0;
    const pickupCount = deliveryModeCounts['PICKUP'] || 0;

    // Города по способам доставки (из delivery_address)
    const mapMode = (mode: string) => {
      if (mode === 'KASPI_DELIVERY' || mode === 'DELIVERY_LOCAL') return 'kaspiDelivery';
      if (mode === 'DELIVERY_REGIONAL_TODOOR') return 'regional';
      if (mode === 'DELIVERY_EXPRESS') return 'express';
      if (mode === 'DELIVERY') return 'sellerDelivery';
      if (mode === 'PICKUP') return 'pickup';
      return 'other';
    };
    const citiesByMode: Record<string, Record<string, number>> = {};
    for (const order of completedOrders) {
      const mode = mapMode(order.delivery_mode || 'unknown');
      const addr = (order.delivery_address as string) || '';
      // Извлекаем город: обычно первое слово до запятой или "г."
      let city = 'Неизвестно';
      if (addr) {
        const parts = addr.split(',').map((s: string) => s.trim());
        city = parts[0]?.replace(/^г\.?\s*/, '') || addr.slice(0, 30);
      }
      if (!citiesByMode[mode]) citiesByMode[mode] = {};
      citiesByMode[mode][city] = (citiesByMode[mode][city] || 0) + 1;
    }

    // === 7. Рентабельность по товарам ===
    const totalProductRevenue = Array.from(productSales.values()).reduce((sum, p) => sum + p.revenue, 0);
    const totalDeliveryAll = Array.from(paymentsByDate.values()).reduce((sum, agg) => sum + agg.delivery, 0);

    // Разделяем опер. расходы: привязанные к товару, к группе, или общие
    const opexPerDayByProduct = new Map<string, number>();
    let generalOpexPerDay = 0;
    const groupOpexPerDay: Record<string, number> = {};
    for (const exp of (opExpenses || [])) {
      const start = new Date(exp.start_date);
      const end = new Date(exp.end_date);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
      const perDay = Number(exp.amount) / days;
      if (exp.product_id) {
        opexPerDayByProduct.set(exp.product_id, (opexPerDayByProduct.get(exp.product_id) || 0) + perDay);
      } else if (exp.product_group) {
        groupOpexPerDay[exp.product_group] = (groupOpexPerDay[exp.product_group] || 0) + perDay;
      } else {
        generalOpexPerDay += perDay;
      }
    }

    // Выручка по группам (для распределения групповых расходов)
    const groupRevenue: Record<string, number> = {};
    for (const [code, data] of productSales) {
      const g = groupMap.get(code);
      if (g) groupRevenue[g] = (groupRevenue[g] || 0) + data.revenue;
    }

    const topProducts = Array.from(productSales.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 50)
      .map(([code, data], idx) => {
        const revenueShare = totalProductRevenue > 0 ? data.revenue / totalProductRevenue : 0;
        const productCommission = data.revenue * (commissionRate / 100);
        const productTax = data.revenue * (taxRate / 100);
        const productDelivery = totalDeliveryAll * revenueShare;
        const productAdCost = adCostBySku.get(code) || 0;
        // Опер. расходы: дневная ставка (прямая + доля групповых + доля общих)
        const directPerDay = opexPerDayByProduct.get(code) || 0;
        const productGroup = groupMap.get(code);
        const groupPerDay = productGroup && groupOpexPerDay[productGroup] && groupRevenue[productGroup]
          ? groupOpexPerDay[productGroup] * (data.revenue / groupRevenue[productGroup])
          : 0;
        const sharedPerDay = generalOpexPerDay * revenueShare;
        const opexPerDay = directPerDay + groupPerDay + sharedPerDay;
        // Для profit/margin используем полную сумму (all-time)
        const totalDays = dailyData.length || 1;
        const productOpex = opexPerDay * totalDays;
        const productProfit = data.revenue - data.costPrice - productCommission - productTax - productDelivery - productAdCost - productOpex;
        const margin = data.revenue > 0 ? (productProfit / data.revenue) * 100 : 0;

        return {
          id: String(idx + 1),
          name: data.name,
          sku: code,
          image: imageMap.get(code) || imageMap.get(data.name) || '',
          sales: data.sold,
          revenue: data.revenue,
          costPrice: data.costPrice,
          commission: productCommission,
          tax: productTax,
          delivery: productDelivery,
          adCost: productAdCost,
          operational: productOpex,
          operationalPerDay: opexPerDay,
          profit: productProfit,
          margin,
          group: groupMap.get(code) || null,
        };
      });

    // === 8. Итоговые цифры ===
    const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = dailyData.reduce((sum, d) => sum + d.orders, 0);
    const totalCost = dailyData.reduce((sum, d) => sum + d.cost, 0);
    const totalCommissions = dailyData.reduce((sum, d) => sum + d.commissions, 0);
    const totalTax = dailyData.reduce((sum, d) => sum + d.tax, 0);
    const totalDelivery = dailyData.reduce((sum, d) => sum + d.delivery, 0);
    const totalOperational = dailyData.reduce((sum, d) => sum + (d.operational || 0), 0);
    const totalProfit = totalRevenue - totalCost - totalCommissions - totalTax - totalDelivery - totalAdvertising - totalOperational;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Источники продаж: гибридный подход
    // 1. Пробуем product-level matching (если adCostBySku не пуст)
    // 2. Если SKU не совпали (0 матчей) или adCostBySku пуст — фолбэк на adTransactions
    let adOrdersCount = 0;
    if (adCostBySku.size > 0) {
      for (const order of (completedOrders || [])) {
        const items = order.items as Array<{ product_code: string }> | null;
        if (items && items.some(item => adCostBySku.has(item.product_code))) {
          adOrdersCount++;
        }
      }
      console.log(`[Analytics] Product-level matching: ${adOrdersCount} ad orders out of ${totalOrders} (adCostBySku keys: ${[...adCostBySku.keys()].slice(0, 5).join(', ')})`);
    }
    // Фолбэк: если product-level не дал результатов — используем adTransactions
    if (adOrdersCount === 0 && adTransactions > 0) {
      adOrdersCount = Math.min(adTransactions, totalOrders);
      console.log(`[Analytics] Fallback to adTransactions: ${adTransactions}, capped to ${adOrdersCount}`);
    }
    const organicOrders = totalOrders - adOrdersCount;

    // === 9. Продажи по менеджерам (все подтверждённые заказы, не только completed) ===
    const confirmedOrdersResult = await supabaseAdmin
      .from('orders')
      .select('kaspi_order_id, total_amount, confirmed_by, confirmed_at, sale_comment, sale_source, status, customer_name, items, created_at' as string)
      .eq('store_id', store.id)
      .not('confirmed_by', 'is', null)
      .order('confirmed_at', { ascending: false });
    const confirmedOrders = (confirmedOrdersResult.data || []) as any[];

    interface ManagerOrder {
      orderId: string;
      amount: number;
      channel: string;
      comment: string | null;
      status: string;
      customer: string;
      productName: string;
      itemsCount: number;
      confirmedAt: string | null;
      createdAt: string | null;
    }
    interface ManagerAgg {
      count: number;
      revenue: number;
      channels: Record<string, number>;
      orders: ManagerOrder[];
      productMap: Map<string, { name: string; qty: number; revenue: number }>;
    }
    const managerMap = new Map<string, ManagerAgg>();
    for (const order of confirmedOrders) {
      const manager = order.confirmed_by as string | null;
      if (!manager) continue;
      const amount = order.total_amount || 0;
      const channel = (order.sale_source as string | null) || 'Другое';
      const items = order.items as Array<{ product_code: string; product_name: string; quantity: number; total: number }> | null;
      const productName = items && items.length > 0 ? items[0].product_name : 'Товар';
      const itemsCount = items ? items.reduce((s: number, it: any) => s + (it.quantity || 1), 0) : 1;
      const orderDetail: ManagerOrder = {
        orderId: order.kaspi_order_id || '',
        amount,
        channel,
        comment: order.sale_comment ?? null,
        status: order.status || '',
        customer: order.customer_name || '',
        productName,
        itemsCount,
        confirmedAt: order.confirmed_at || null,
        createdAt: order.created_at || null,
      };
      const existing = managerMap.get(manager);
      if (existing) {
        existing.count += 1;
        existing.revenue += amount;
        existing.channels[channel] = (existing.channels[channel] || 0) + 1;
        existing.orders.push(orderDetail);
      } else {
        managerMap.set(manager, { count: 1, revenue: amount, channels: { [channel]: 1 }, orders: [orderDetail], productMap: new Map() });
      }
      // Агрегация товаров по менеджеру
      const mgr = managerMap.get(manager)!;
      if (items) {
        for (const item of items) {
          const code = item.product_code || item.product_name;
          const ex = mgr.productMap.get(code);
          if (ex) {
            ex.qty += item.quantity || 1;
            ex.revenue += item.total || 0;
          } else {
            mgr.productMap.set(code, { name: item.product_name, qty: item.quantity || 1, revenue: item.total || 0 });
          }
        }
      }
    }
    const managerSales = Array.from(managerMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([manager, agg]) => {
        const topChannel = Object.entries(agg.channels).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        const products = Array.from(agg.productMap.entries())
          .map(([code, p]) => ({ code, name: p.name, qty: p.qty, revenue: p.revenue }))
          .sort((a, b) => b.revenue - a.revenue);
        return { manager, count: agg.count, revenue: agg.revenue, channels: agg.channels, topChannel, orders: agg.orders, products };
      });

    // === 10. Товары без себестоимости (из всех завершённых заказов) ===
    let productsWithoutCost: Array<{ code: string; name: string }> = [];
    try {
      // Build map: product_code → name (from order items)
      const allOrderProducts = new Map<string, string>();
      for (const order of [...completedOrders, ...confirmedOrders]) {
        const orderItems = order.items as any[] | null;
        if (orderItems) for (const it of orderItems) {
          if (it.product_code && !allOrderProducts.has(it.product_code)) {
            allOrderProducts.set(it.product_code, it.product_name || it.product_code);
          }
        }
      }
      if (allOrderProducts.size > 0) {
        // Limit to avoid URI-too-long errors; custom_ products are checked separately anyway
        const codes = [...allOrderProducts.keys()].slice(0, 500);
        // 1. Products in DB with cost_price IS NULL
        const missingCostResult = await supabaseAdmin
          .from('products')
          .select('kaspi_id, name')
          .eq('store_id', store.id)
          .is('cost_price', null)
          .in('kaspi_id', codes);
        const missingSet = new Set((missingCostResult.data || []).map((p: any) => p.kaspi_id));
        productsWithoutCost = (missingCostResult.data || []).map((p: any) => ({ code: p.kaspi_id, name: p.name }));
        // 2. custom_ products not in DB at all (old orders before auto-creation was added)
        for (const [code, name] of allOrderProducts) {
          if (code.startsWith('custom_') && !costPriceMap.has(code) && !missingSet.has(code)) {
            productsWithoutCost.push({ code, name });
          }
        }
      }
    } catch (err) {
      console.error('[Analytics] productsWithoutCost error (non-fatal):', err);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        totalCost,
        totalAdvertising,
        totalTax,
        totalCommissions,
        totalDelivery,
        totalOperational,
        totalProfit,
        avgOrderValue,
        ordersBySource: {
          organic: organicOrders,
          ads: adOrdersCount,
          offline: 0,
        },
        pendingOrders: {
          count: activeOrders.length,
          totalAmount: activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          orders: pendingOrdersList,
        },
        dailyData,
        dailyDataByCreation,
        topProducts,
        ordersByStatus: {
          pending,
          processing,
          shipped,
          delivered,
          cancelled,
          returned,
        },
        returnedOrders,
        salesSources: {
          organic: organicOrders,
          advertising: adOrdersCount,
        },
        deliveryModes: {
          kaspiDelivery,
          regional,
          express,
          sellerDelivery,
          pickup: pickupCount,
        },
        deliveryCities: citiesByMode,
        marketing: {
          totalCost: totalAdvertising,
          totalGmv: adGmv,
          roas: totalAdvertising > 0 ? adGmv / totalAdvertising : 0,
          campaigns: marketingCampaigns,
        },
        storeSettings: {
          commissionRate,
          taxRate,
        },
        operationalExpenses: opExpenses || [],
        productGroupsMeta,
        managerSales,
        productsWithoutCost,
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера'
    }, { status: 500 });
  }
}
