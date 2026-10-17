import { constantTimeEqual, verifyWhatsAppSignature } from './whatsappSignature.ts';
export function createWhatsAppWebhookHandler(options: {
  getSecret: () => string | undefined; getVerifyToken: () => string | undefined;
  process: (payload: unknown) => Promise<void>;
}) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'GET') {
      const q = new URL(req.url).searchParams;
      const token = options.getVerifyToken();
      if (token && q.get('hub.mode') === 'subscribe' && constantTimeEqual(q.get('hub.verify_token') ?? '', token) && q.has('hub.challenge')) return new Response(q.get('hub.challenge'), { headers: { 'Content-Type': 'text/plain' } });
      return new Response('Forbidden', { status: 403 });
    }
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const limit = 256 * 1024;
    if (Number(req.headers.get('Content-Length')) > limit) return new Response('Body too large', { status: 413 });
    const raw = await req.arrayBuffer();
    if (raw.byteLength > limit) return new Response('Body too large', { status: 413 });
    const secret = options.getSecret();
    if (!secret) return new Response('WhatsApp webhook is not configured.', { status: 503 });
    if (!await verifyWhatsAppSignature(raw, req.headers.get('X-Hub-Signature-256'), secret)) return new Response('Invalid signature', { status: 401 });
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); } catch { return new Response('Invalid JSON', { status: 400 }); }
    try { await options.process(payload); return new Response('EVENT_RECEIVED'); }
    catch { return new Response('Processing failed. Review the inbox before retrying.', { status: 500 }); }
  };
}
