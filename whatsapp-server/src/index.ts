import express from 'express';
import { authMiddleware } from './auth.js';
import { sessionManager } from './session-manager.js';
import { initFeedbackHandler } from './feedback-handler.js';
import { feedbackScheduler } from './feedback-scheduler.js';

const app = express();
app.use(express.json());

// Health check (без auth — для Railway)
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use(authMiddleware);

// === Сессии ===

// Начать сессию (генерация QR)
app.post('/session/start', async (req, res) => {
  try {
    const { storeId } = req.body;
    if (!storeId) {
      res.status(400).json({ error: 'storeId обязателен' });
      return;
    }

    const result = await sessionManager.startSession(storeId);
    res.json(result);
  } catch (err) {
    console.error('session/start error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Статус сессии
app.get('/session/:storeId/status', async (req, res) => {
  const { storeId } = req.params;
  const result = await sessionManager.getStatus(storeId);
  res.json(result);
});

// Получить QR
app.get('/session/:storeId/qr', (req, res) => {
  const { storeId } = req.params;
  const qr = sessionManager.getQR(storeId);
  if (!qr) {
    res.status(404).json({ error: 'QR не найден' });
    return;
  }
  res.json({ qr });
});

// Отключить сессию
app.delete('/session/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    await sessionManager.disconnect(storeId);
    res.json({ success: true });
  } catch (err) {
    console.error('session/disconnect error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// === Сообщения ===

// Отправить сообщение
app.post('/message/send', async (req, res) => {
  try {
    const { storeId, phone, message } = req.body;
    if (!storeId || !phone || !message) {
      res.status(400).json({ error: 'storeId, phone, message обязательны' });
      return;
    }

    const sent = await sessionManager.sendMessage(storeId, phone, message);
    res.json({ success: sent });
  } catch (err) {
    console.error('message/send error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Отправить batch сообщений
app.post('/message/send-batch', async (req, res) => {
  try {
    const { storeId, messages } = req.body;
    if (!storeId || !Array.isArray(messages)) {
      res.status(400).json({ error: 'storeId, messages[] обязательны' });
      return;
    }

    const results: Array<{ phone: string; success: boolean }> = [];

    for (const msg of messages) {
      const sent = await sessionManager.sendMessage(storeId, msg.phone, msg.message);
      results.push({ phone: msg.phone, success: sent });

      // Задержка 1-3 сек между сообщениями (анти-бан)
      const delay = 1000 + Math.random() * 2000;
      await new Promise(r => setTimeout(r, delay));
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('message/send-batch error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Отправить poll (опрос)
app.post('/poll/send', async (req, res) => {
  try {
    const { storeId, phone, question, options } = req.body;
    if (!storeId || !phone || !question || !Array.isArray(options)) {
      res.status(400).json({ error: 'storeId, phone, question, options[] обязательны' });
      return;
    }

    const result = await sessionManager.sendPoll(storeId, phone, question, options);
    res.json(result);
  } catch (err) {
    console.error('poll/send error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// === Прокси для Kaspi (Vercel IP заблокирован, Railway — нет) ===

app.get('/kaspi-proxy/merchant/:merchantId/reviews', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const url = `https://kaspi.kz/shop/info/merchant/${merchantId}/reviews`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Referer': 'https://kaspi.kz/',
      },
    });
    if (!resp.ok) {
      res.status(resp.status).json({ error: `Kaspi returned ${resp.status}` });
      return;
    }
    const html = await resp.text();
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('kaspi-proxy merchant error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
});

app.get('/kaspi-proxy/reviews-list/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const page = req.query.page || '0';
    const size = req.query.size || '10';
    const resp = await fetch(
      `https://kaspi.kz/yml/review-view/api/v1/reviews/merchant/${merchantId}?page=${page}&size=${size}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': `https://kaspi.kz/shop/info/merchant/${merchantId}/reviews`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    );
    if (!resp.ok) {
      res.status(resp.status).json({ error: `Kaspi returned ${resp.status}` });
      return;
    }
    const json = await resp.json();
    res.json(json);
  } catch (err) {
    console.error('kaspi-proxy reviews-list error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
});

const PORT = parseInt(process.env.PORT || '3001');

app.listen(PORT, () => {
  console.log(`WhatsApp server running on port ${PORT}`);

  // Инициализация feedback системы
  initFeedbackHandler();
  feedbackScheduler.start();

  // Auto-start persistent sessions on boot (reconnect from saved credentials)
  sessionManager.ensureConnected('metricon-global').then(connected => {
    console.log(`[boot] metricon-global: ${connected ? 'connected ✓' : 'not connected (needs QR scan)'}`);
  }).catch(err => {
    console.error('[boot] metricon-global auto-start failed:', err);
  });
});
