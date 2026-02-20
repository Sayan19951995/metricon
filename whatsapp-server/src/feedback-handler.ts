/**
 * Обработчик ответов на feedback poll.
 * Положительный → ссылки на отзывы в Kaspi.
 * Отрицательный → "Расскажите, что случилось?"
 */

import { supabase } from './supabase.js';
import { sessionManager } from './session-manager.js';

interface FeedbackSettings {
  good_option: string;
  bad_option: string;
  good_response: string;
  bad_response: string;
}

const DEFAULT_SETTINGS: FeedbackSettings = {
  good_option: 'Отлично',
  bad_option: 'Плохо',
  good_response: 'Спасибо! Будем рады, если оставите отзыв:',
  bad_response: 'Нам жаль это слышать. Расскажите, что случилось?',
};

// Кэш настроек (storeId → settings)
const settingsCache = new Map<string, { settings: FeedbackSettings; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 мин

async function getSettings(storeId: string): Promise<FeedbackSettings> {
  const cached = settingsCache.get(storeId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.settings;
  }

  const { data } = await supabase
    .from('feedback_settings')
    .select('good_option, bad_option, good_response, bad_response')
    .eq('store_id', storeId)
    .single();

  const settings: FeedbackSettings = data || DEFAULT_SETTINGS;
  settingsCache.set(storeId, { settings, cachedAt: Date.now() });
  return settings;
}

/**
 * Генерирует ссылки на отзывы Kaspi для товаров заказа.
 */
function generateReviewLinks(orderId: string, items: any[]): string[] {
  const links: string[] = [];
  for (const item of items) {
    const productCode = item.kaspi_id || item.product_code || null;
    if (productCode) {
      links.push(
        `https://kaspi.kz/shop/review/productreview?orderCode=${orderId}&productCode=${productCode}&rating=5`
      );
    }
  }
  return links;
}

/**
 * Нормализует номер телефона из JID WhatsApp (убирает @s.whatsapp.net).
 */
function phoneFromJid(jid: string): string {
  return jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
}

/**
 * Обработка голоса в Poll.
 */
export async function handlePollVote(
  storeId: string,
  from: string,
  votes: Array<{ name: string; voters: string[] }>,
  pollMessageId: string
): Promise<void> {
  const phone = phoneFromJid(from);

  // Ищем запись в feedback_queue с poll_sent и совпадающим телефоном
  const { data: entry } = await supabase
    .from('feedback_queue')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'poll_sent')
    .like('customer_phone', `%${phone.slice(-10)}`)
    .limit(1)
    .single();

  if (!entry) {
    console.log(`[feedback] No pending feedback for phone ${phone} in store ${storeId}`);
    return;
  }

  const settings = await getSettings(storeId);
  const selectedOption = votes[0]?.name || '';

  const isPositive = selectedOption.toLowerCase().includes(settings.good_option.toLowerCase()) ||
    selectedOption.toLowerCase().includes('отлично') ||
    selectedOption.toLowerCase().includes('жақсы');

  if (isPositive) {
    // Положительный отзыв → ссылки на Kaspi
    const items = (entry.items as any[]) || [];
    const links = generateReviewLinks(entry.order_id, items);

    let responseText = settings.good_response;
    if (links.length > 0) {
      responseText += '\n\n' + links.join('\n');
    }

    await sessionManager.sendMessage(storeId, phone, responseText);

    await supabase
      .from('feedback_queue')
      .update({
        status: 'positive',
        responded_at: new Date().toISOString(),
        response: selectedOption,
        review_links_sent: links.length > 0,
      })
      .eq('id', entry.id);

    console.log(`[feedback] Positive response from ${phone}, sent ${links.length} review links`);
  } else {
    // Отрицательный отзыв
    await sessionManager.sendMessage(storeId, phone, settings.bad_response);

    await supabase
      .from('feedback_queue')
      .update({
        status: 'negative',
        responded_at: new Date().toISOString(),
        response: selectedOption,
      })
      .eq('id', entry.id);

    console.log(`[feedback] Negative response from ${phone}`);
  }
}

/**
 * Обработка текстового ответа (фоллбэк — клиент пишет "1" или "2" вместо poll).
 */
export async function handleTextResponse(
  storeId: string,
  from: string,
  text: string
): Promise<void> {
  const phone = phoneFromJid(from);
  const trimmed = text.trim();

  // Только если клиент ответил "1" или "2"
  if (trimmed !== '1' && trimmed !== '2') return;

  const { data: entry } = await supabase
    .from('feedback_queue')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'poll_sent')
    .like('customer_phone', `%${phone.slice(-10)}`)
    .limit(1)
    .single();

  if (!entry) return;

  const settings = await getSettings(storeId);

  if (trimmed === '1') {
    const items = (entry.items as any[]) || [];
    const links = generateReviewLinks(entry.order_id, items);
    let responseText = settings.good_response;
    if (links.length > 0) {
      responseText += '\n\n' + links.join('\n');
    }

    await sessionManager.sendMessage(storeId, phone, responseText);
    await supabase
      .from('feedback_queue')
      .update({
        status: 'positive',
        responded_at: new Date().toISOString(),
        response: 'text:1',
        review_links_sent: links.length > 0,
      })
      .eq('id', entry.id);
  } else {
    await sessionManager.sendMessage(storeId, phone, settings.bad_response);
    await supabase
      .from('feedback_queue')
      .update({
        status: 'negative',
        responded_at: new Date().toISOString(),
        response: 'text:2',
      })
      .eq('id', entry.id);
  }
}

/**
 * Инициализация: подключает обработчик входящих сообщений к sessionManager.
 */
export function initFeedbackHandler(): void {
  sessionManager.onIncomingMessage((storeId, msg) => {
    if (msg.pollVotes && msg.pollVotes.length > 0) {
      handlePollVote(storeId, msg.from, msg.pollVotes, msg.pollCreationMessageId || msg.messageId)
        .catch(err => console.error('[feedback] Poll vote error:', err));
    } else if (msg.text) {
      handleTextResponse(storeId, msg.from, msg.text)
        .catch(err => console.error('[feedback] Text response error:', err));
    }
  });

  console.log('[feedback] Handler initialized');
}
