/**
 * Логика триггеров авторассылки.
 * Вызывается из Kaspi sync при обнаружении новых/выданных заказов.
 */

import { supabase } from '@/lib/supabase/client';
import { waSendMessage } from './client';

interface OrderInfo {
  kaspi_order_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  delivery_date?: string | null;
  items?: Array<{ product_name: string; quantity: number; price: number }>;
}

/**
 * Подставляет переменные в шаблон.
 */
function substituteVariables(template: string, order: OrderInfo, storeName: string): string {
  let result = template;

  result = result.replace(/\{customer_name\}/g, order.customer_name || 'Покупатель');
  result = result.replace(/\{order_id\}/g, order.kaspi_order_id || '');
  result = result.replace(/\{order_total\}/g, order.total_amount?.toLocaleString('ru-RU') || '0');
  result = result.replace(/\{shop_name\}/g, storeName);
  result = result.replace(/\{delivery_date\}/g, order.delivery_date || '');

  // Список товаров
  if (order.items && order.items.length > 0) {
    const itemsList = order.items
      .map(item => `- ${item.product_name} x${item.quantity} — ${item.price.toLocaleString('ru-RU')} ₸`)
      .join('\n');
    result = result.replace(/\{order_items\}/g, itemsList);
  } else {
    result = result.replace(/\{order_items\}/g, '');
  }

  return result;
}

/**
 * Отправляет WhatsApp уведомления по триггеру.
 * Вызывать из /api/kaspi/sync после обработки заказов.
 */
export async function triggerWhatsAppMessages(
  storeId: string,
  storeName: string,
  triggerType: string,
  orders: OrderInfo[]
): Promise<{ sent: number; failed: number }> {
  if (orders.length === 0) return { sent: 0, failed: 0 };

  // 1. Проверяем, подключен ли WhatsApp у магазина
  const { data: store } = await supabase
    .from('stores')
    .select('whatsapp_connected, mailing_settings')
    .eq('id', storeId)
    .single();

  if (!store?.whatsapp_connected) {
    return { sent: 0, failed: 0 };
  }

  // Проверяем, включена ли авторассылка в настройках
  const mailingSettings = (store as any).mailing_settings as Record<string, any> | null;
  if (mailingSettings && mailingSettings.enabled === false) {
    return { sent: 0, failed: 0 };
  }

  // 2. Ищем активный шаблон для этого триггера
  const { data: templates } = await supabase
    .from('message_templates')
    .select('*')
    .eq('store_id', storeId)
    .eq('trigger_type', triggerType)
    .eq('status', 'active')
    .limit(1);

  const template = templates?.[0];
  if (!template || !template.template_ru) {
    return { sent: 0, failed: 0 };
  }

  // 3. Отправляем сообщения
  let sent = 0;
  let failed = 0;

  for (const order of orders) {
    if (!order.customer_phone) {
      failed++;
      continue;
    }

    const messageText = substituteVariables(template.template_ru, order, storeName);

    try {
      const success = await waSendMessage(storeId, order.customer_phone, messageText);

      // 4. Логируем в message_logs
      await supabase.from('message_logs').insert({
        store_id: storeId,
        order_id: order.kaspi_order_id,
        phone: order.customer_phone,
        message: messageText,
        status: success ? 'sent' : 'failed',
        sent_at: success ? new Date().toISOString() : null,
      });

      if (success) {
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`triggerWhatsApp error [${storeId}] order ${order.kaspi_order_id}:`, err);
      failed++;
    }
  }

  // 5. Обновляем статистику шаблона
  if (sent > 0) {
    await supabase
      .from('message_templates')
      .update({
        sent_count: (template.sent_count || 0) + sent,
        last_sent_at: new Date().toISOString(),
      } as any)
      .eq('id', template.id);
  }

  console.log(`triggerWhatsApp [${storeId}] ${triggerType}: sent=${sent}, failed=${failed}`);
  return { sent, failed };
}
