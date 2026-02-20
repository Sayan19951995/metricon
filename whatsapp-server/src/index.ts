import express from 'express';
import { authMiddleware } from './auth.js';
import { sessionManager } from './session-manager.js';

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
app.get('/session/:storeId/status', (req, res) => {
  const { storeId } = req.params;
  const result = sessionManager.getStatus(storeId);
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

const PORT = parseInt(process.env.PORT || '3001');

app.listen(PORT, () => {
  console.log(`WhatsApp server running on port ${PORT}`);
});
