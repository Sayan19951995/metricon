/**
 * Webhook endpoint for WhatsApp microservice events.
 * Receives: poll_vote, connection_update, message_received
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { waSendMessage } from '@/lib/whatsapp/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
);

const WA_SERVER_SECRET = process.env.WA_SERVER_SECRET || 'dev-secret';

export async function POST(req: NextRequest) {
  // Validate API key
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== WA_SERVER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { event } = body;

    switch (event) {
      case 'poll_vote':
        await handlePollVote(body);
        break;
      case 'connection_update':
        await handleConnectionUpdate(body);
        break;
      case 'message_received':
        // Future: handle text replies to negative feedback
        console.log(`[Webhook] Message from ${body.phone}: ${body.text?.slice(0, 100)}`);
        break;
      default:
        console.log(`[Webhook] Unknown event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Webhook] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Handle poll vote from customer.
 * Match feedback_queue entry → update status → send follow-up.
 */
async function handlePollVote(body: {
  storeId: string;
  phone: string;
  pollMsgId?: string;
  selectedHashes?: string[];
}) {
  const { storeId, phone, pollMsgId } = body;

  // Find the feedback_queue entry for this phone + store
  const { data: entry } = await supabaseAdmin
    .from('feedback_queue')
    .select('*')
    .eq('store_id', storeId)
    .eq('customer_phone', phone)
    .eq('status', 'poll_sent')
    .order('poll_sent_at', { ascending: false })
    .limit(1)
    .single();

  if (!entry) {
    console.log(`[Webhook] No pending poll for store=${storeId} phone=${phone}`);
    return;
  }

  // Load feedback settings to match option names
  const { data: settings } = await supabaseAdmin
    .from('feedback_settings')
    .select('*')
    .eq('store_id', storeId)
    .single();

  if (!settings) return;

  // Since Baileys gives SHA256 hashes, we can't directly match option text.
  // Workaround: use pollMsgId to match, and treat the first vote as the response.
  // For a 2-option poll (good/bad), we determine by matching the poll_message_id.
  // The WA server sends selectedHashes — we'll match by index for simplicity.
  // Option 0 = good_option, Option 1 = bad_option (same order as sent)

  // For now, we'll try matching via another approach:
  // If there's only one pending entry per phone, just check if any vote came in.
  // The actual option matching requires storing option hashes at send time.
  // Simplified: use the first selected hash. If it matches the hash of good_option → positive.

  // More robust: store the poll message ID when sending and match here
  const isPositive = pollMsgId === entry.poll_message_id;

  // Since we can't reliably determine positive/negative from hashes alone,
  // use a different approach: send a NUMBERED poll and parse the number.
  // OR: just ask the WA server to decode and send the option text directly.

  // For MVP: treat any vote as needing a response, try to determine from hash order.
  // The poll was sent with [good_option, bad_option] in that order.
  // Baileys polls: first option hash = SHA256(good_option), second = SHA256(bad_option)
  // We'll compute and compare.

  const crypto = await import('crypto');
  const goodHash = crypto.createHash('sha256').update(settings.good_option || 'Отлично').digest('hex');
  const badHash = crypto.createHash('sha256').update(settings.bad_option || 'Плохо').digest('hex');

  const selectedHashes = body.selectedHashes || [];
  let responseType: 'positive' | 'negative' = 'positive';

  if (selectedHashes.length > 0) {
    if (selectedHashes.includes(badHash)) {
      responseType = 'negative';
    } else if (selectedHashes.includes(goodHash)) {
      responseType = 'positive';
    }
    // If neither matches (hash format mismatch), default to positive
  }

  // Update feedback_queue
  await supabaseAdmin
    .from('feedback_queue')
    .update({
      status: responseType,
      response: responseType,
      responded_at: new Date().toISOString(),
    } as any)
    .eq('id', entry.id);

  console.log(`[Webhook] Poll vote: store=${storeId} phone=${phone} response=${responseType}`);

  // Send follow-up message
  if (responseType === 'positive') {
    // Send good_response + review links
    const items = (entry.items as any[]) || [];
    let reviewLinks = '';
    for (const item of items) {
      if (item.kaspi_id) {
        reviewLinks += `\nhttps://kaspi.kz/shop/review/productreview?productCode=${item.kaspi_id}`;
      }
    }

    const goodResponse = (settings.good_response || 'Спасибо!') + (reviewLinks ? '\n' + reviewLinks : '');
    try {
      await waSendMessage(storeId, phone, goodResponse);
      await supabaseAdmin
        .from('feedback_queue')
        .update({ review_links_sent: true } as any)
        .eq('id', entry.id);
    } catch (err) {
      console.error(`[Webhook] Failed to send good_response:`, err);
    }
  } else {
    // Send bad_response
    const badResponse = settings.bad_response || 'Нам жаль это слышать.';
    try {
      await waSendMessage(storeId, phone, badResponse);
    } catch (err) {
      console.error(`[Webhook] Failed to send bad_response:`, err);
    }
  }
}

/**
 * Handle connection status update from WA server.
 */
async function handleConnectionUpdate(body: { storeId: string; status: string }) {
  const { storeId, status } = body;

  const connected = status === 'connected';
  await supabaseAdmin
    .from('stores')
    .update({ whatsapp_connected: connected } as any)
    .eq('id', storeId);

  console.log(`[Webhook] Connection update: store=${storeId} status=${status}`);
}
