/**
 * Планировщик опросов обратной связи.
 * Каждые 30 сек проверяет feedback_queue на ожидающие отправки.
 * Каждые 5 мин помечает просроченные как expired.
 */

import { supabase } from './supabase.js';
import { sessionManager } from './session-manager.js';

const POLL_INTERVAL = 30_000;    // 30 сек
const EXPIRE_INTERVAL = 5 * 60_000; // 5 мин
const BATCH_SIZE = 10;

class FeedbackScheduler {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private expireTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  start(): void {
    if (this.running) return;
    this.running = true;

    console.log('[feedback-scheduler] Started');

    // Проверяем очередь каждые 30 сек
    this.pollTimer = setInterval(() => {
      this.processPending().catch(err =>
        console.error('[feedback-scheduler] processPending error:', err)
      );
    }, POLL_INTERVAL);

    // Просроченные каждые 5 мин
    this.expireTimer = setInterval(() => {
      this.expireOld().catch(err =>
        console.error('[feedback-scheduler] expireOld error:', err)
      );
    }, EXPIRE_INTERVAL);

    // Первый запуск сразу
    setTimeout(() => this.processPending().catch(() => {}), 5000);
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.expireTimer) clearInterval(this.expireTimer);
    this.running = false;
    console.log('[feedback-scheduler] Stopped');
  }

  /**
   * Обработка pending записей: отправка poll.
   */
  private async processPending(): Promise<void> {
    const { data: entries, error } = await supabase
      .from('feedback_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      console.error('[feedback-scheduler] Query error:', error.message);
      return;
    }

    if (!entries || entries.length === 0) return;

    console.log(`[feedback-scheduler] Processing ${entries.length} pending entries`);

    for (const entry of entries) {
      try {
        // Получаем настройки для этого магазина
        const { data: settings } = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('store_id', entry.store_id)
          .single();

        if (!settings || !settings.enabled) {
          // Feedback отключен — пропускаем
          await supabase
            .from('feedback_queue')
            .update({ status: 'expired' })
            .eq('id', entry.id);
          continue;
        }

        const question = settings.poll_question || 'Как вам заказ? Оцените пожалуйста';
        const options = [
          settings.good_option || 'Отлично',
          settings.bad_option || 'Плохо',
        ];

        const result = await sessionManager.sendPoll(
          entry.store_id,
          entry.customer_phone,
          question,
          options
        );

        if (result.success) {
          await supabase
            .from('feedback_queue')
            .update({
              status: 'poll_sent',
              poll_message_id: result.messageId || null,
              poll_sent_at: new Date().toISOString(),
            })
            .eq('id', entry.id);

          console.log(`[feedback-scheduler] Poll sent for order ${entry.order_id}`);
        } else {
          await supabase
            .from('feedback_queue')
            .update({ status: 'failed' })
            .eq('id', entry.id);

          console.log(`[feedback-scheduler] Failed to send poll for order ${entry.order_id}`);
        }

        // Задержка 2-4 сек между отправками (анти-бан)
        const delay = 2000 + Math.random() * 2000;
        await new Promise(r => setTimeout(r, delay));
      } catch (err) {
        console.error(`[feedback-scheduler] Error processing entry ${entry.id}:`, err);
        await supabase
          .from('feedback_queue')
          .update({ status: 'failed' })
          .eq('id', entry.id);
      }
    }
  }

  /**
   * Помечает старые poll_sent записи как expired (нет ответа за expire_hours).
   */
  private async expireOld(): Promise<void> {
    // По умолчанию expire через 24 часа
    const expireBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('feedback_queue')
      .update({ status: 'expired' })
      .eq('status', 'poll_sent')
      .lt('poll_sent_at', expireBefore)
      .select('id');

    if (error) {
      console.error('[feedback-scheduler] Expire error:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log(`[feedback-scheduler] Expired ${data.length} old entries`);
    }
  }
}

export const feedbackScheduler = new FeedbackScheduler();
