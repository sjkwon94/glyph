import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, requireWebhookEnvironment, verifyHmac } from '../_shared/webhook.ts';

type PaymentEvent = {
  eventId: string;
  providerOrderId: string;
  status: 'paid' | 'failed' | 'cancelled' | 'refunded';
  amountKrw: number;
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const { url, serviceKey, secret } = requireWebhookEnvironment('PAYMENT_WEBHOOK_SECRET');
    const rawBody = await request.text();
    if (!await verifyHmac(rawBody, request.headers.get('x-glyph-signature'), secret)) return json({ error: 'invalid_signature' }, 401);
    const event = JSON.parse(rawBody) as PaymentEvent;
    if (!event.eventId || !event.providerOrderId || !Number.isInteger(event.amountKrw)) return json({ error: 'invalid_payload' }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: order, error: orderError } = await admin.from('purchase_orders').select('id').eq('provider_order_id', event.providerOrderId).single();
    if (orderError || !order) return json({ error: 'order_not_found' }, 404);
    const { error: applyError } = await admin.rpc('server_apply_payment_event', {
      p_order_id: order.id,
      p_event_id: event.eventId,
      p_status: event.status,
      p_amount_krw: event.amountKrw,
    });
    if (applyError) throw applyError;
    return json({ ok: true });
  } catch (error) {
    console.error('payment_webhook_failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'webhook_failed' }, 500);
  }
});
