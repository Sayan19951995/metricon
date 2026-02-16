import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { KaspiMarketingClient, MarketingSession, MarketingCampaign } from '@/lib/kaspi/marketing-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'userId обязателен'
      }, { status: 400 });
    }

    const storeResult = await supabase
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

    // === 0. Загрузить себестоимость товаров ===
    const productsResult = await supabase
      .from('products')
      .select('kaspi_id, cost_price, product_group')
      .eq('store_id', store.id);
    const productsDb = productsResult.data || [];

    const costPriceMap = new Map<string, number>();
    const groupMap = new Map<string, string>();
    for (const p of productsDb) {
      if (p.kaspi_id && p.cost_price) {
        costPriceMap.set(p.kaspi_id, Number(p.cost_price));
      }
      if (p.kaspi_id && p.product_group) {
        groupMap.set(p.kaspi_id, p.product_group);
      }
    }

    // === 1. Поступления по дате выдачи (completed_at) ===
    const completedOrdersResult = await supabase
      .from('orders')
      .select('total_amount, completed_at, status, delivery_cost, delivery_mode, delivery_address, items')
      .eq('store_id', store.id)
      .not('completed_at', 'is', null)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });
    const completedOrders = completedOrdersResult.data || [];

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
    const opExpensesResult = await supabase
      .from('operational_expenses')
      .select('*')
      .eq('store_id', store.id);
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

    // === 2b. Выручка по дате создания заказа (для "Структура выручки") ===
    const allOrdersResult = await supabase
      .from('orders')
      .select('items, total_amount, status, created_at, delivery_cost')
      .eq('store_id', store.id)
      .not('status', 'in', '(cancelled,returned)');
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
    const returnedOrdersByCreationResult = await supabase
      .from('orders')
      .select('created_at')
      .eq('store_id', store.id)
      .eq('status', 'returned');
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
    const ordersByStatusResult = await supabase
      .from('orders')
      .select('status')
      .eq('store_id', store.id);
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
    const completedStatuses = ['completed', 'delivered', 'cancelled', 'returned', 'archive'];
    const activeOrdersResult = await supabase
      .from('orders')
      .select('kaspi_order_id, customer_name, delivery_address, total_amount, created_at, items, status')
      .eq('store_id', store.id)
      .not('status', 'in', `(${completedStatuses.join(',')})`)
      .order('created_at', { ascending: false });
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
    const returnedOrdersResult = await supabase
      .from('orders')
      .select('kaspi_order_id, customer_name, total_amount, created_at, items')
      .eq('store_id', store.id)
      .eq('status', 'returned')
      .order('created_at', { ascending: false })
      .limit(50);
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
            await supabase.from('stores')
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
          image: '',
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
