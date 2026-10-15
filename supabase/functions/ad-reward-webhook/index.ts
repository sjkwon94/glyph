import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, requireWebhookEnvironment, verifyHmac } from '../_shared/webhook.ts';

type RewardEvent = { eventId: string; sessionId: string; completed: boolean };

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const { url, serviceKey, secret } = requireWebhookEnvironment('AD_REWARD_WEBHOOK_SECRET');
    const rawBody = await request.text();
    if (!await verifyHmac(rawBody, request.headers.get('x-glyph-signature'), secret)) return json({ error: 'invalid_signature' }, 401);
    const event = JSON.parse(rawBody) as RewardEvent;
    if (!event.eventId || !event.sessionId) return json({ error: 'invalid_payload' }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: session, error: sessionError } = await admin.from('reward_sessions').select('id').eq('id', event.sessionId).single();
    if (sessionError || !session) return json({ error: 'session_not_found' }, 404);
    const { error: verifyError } = await admin.rpc('server_verify_reward', {
      p_session_id: session.id,
      p_event_id: event.eventId,
      p_completed: event.completed,
    });
    if (verifyError) throw verifyError;
    return json({ ok: true, rewarded: event.completed });
  } catch (error) {
    console.error('ad_reward_webhook_failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'webhook_failed' }, 500);
  }
});
