import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyWhatsAppSignature } from '../../supabase/functions/_shared/whatsappSignature';
import { createWhatsAppWebhookHandler } from '../../supabase/functions/_shared/whatsappWebhookRequest';
import { customerWindowOpen, isWhatsAppEnabled, sendWhatsAppText, canSendWhatsAppTemplate } from '../../supabase/functions/_shared/whatsappSend';
const enabled = { enabled: 'true', provider: 'meta', accessToken: 'test-token', phoneNumberId: 'test-number-id' };
async function signature(body: string) {
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode('test-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return 'sha256=' + Buffer.from(await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))).toString('hex');
}
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Real network forbidden'); })); });
afterEach(() => { vi.unstubAllGlobals(); });
describe('WhatsApp signature and request verification', () => {
  it('accepts only the exact signed body using a fixed-length comparison', async () => {
    const sig = await signature('{"text":"Hello"}');
    expect(await verifyWhatsAppSignature('{"text":"Hello"}', sig, 'test-secret')).toBe(true);
    for (const [body, supplied, secret] of [['changed', sig, 'test-secret'],['{"text":"Hello"}', sig, 'wrong-secret'],['{}',null,'test-secret'],['{}','sha256=00','test-secret'],['{}',sig,'']]) expect(await verifyWhatsAppSignature(body, supplied, secret)).toBe(false);
  });
  it('verifies GET challenge and refuses a missing or wrong verify token', async () => {
    const process = vi.fn();
    const handler = createWhatsAppWebhookHandler({ getSecret: () => 'test-secret', getVerifyToken: () => 'verify', process });
    expect(await (await handler(new Request('https://example.test?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=hello'))).text()).toBe('hello');
    expect((await handler(new Request('https://example.test?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=hello'))).status).toBe(403);
    expect(process).not.toHaveBeenCalled();
  });
  it('returns 503 unset, 401 bad signature and processes only signed JSON', async () => {
    const process = vi.fn().mockResolvedValue(undefined);
    const handler = (secret?: string) => createWhatsAppWebhookHandler({ getSecret: () => secret, getVerifyToken: () => 'verify', process });
    const request = (sig?: string, body = '{}') => new Request('https://example.test', { method: 'POST', body, headers: sig ? { 'X-Hub-Signature-256': sig } : {} });
    expect((await handler()(request())).status).toBe(503);
    expect((await handler('test-secret')(request())).status).toBe(401);
    expect(process).not.toHaveBeenCalled();
    expect((await handler('test-secret')(request(await signature('{}')))).status).toBe(200);
    expect(process).toHaveBeenCalledWith({});
    expect((await handler('test-secret')(request(await signature('bad'), 'bad'))).status).toBe(400);
  });
  it('rejects oversized bodies before signature checking, including without Content-Length', async () => {
    const process = vi.fn();
    const handler = createWhatsAppWebhookHandler({ getSecret: () => 'test-secret', getVerifyToken: () => 'verify', process });
    for (const headers of [{}, { 'Content-Length': String(256 * 1024 + 1) }]) {
      const response = await handler(new Request('https://example.test', { method: 'POST', body: 'x'.repeat(256 * 1024 + 1), headers }));
      expect(response.status).toBe(413);
    }
    expect(process).not.toHaveBeenCalled();
  });
  it('checks exact binary bytes and accepts upper-case signature hex', async () => {
    const bytes = new Uint8Array([0xff,0xfe,0x00,0x80]);
    const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode('test-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = 'sha256=' + Buffer.from(await webcrypto.subtle.sign('HMAC', key, bytes)).toString('hex').toUpperCase();
    expect(await verifyWhatsAppSignature(bytes, sig, 'test-secret')).toBe(true);
    const process = vi.fn();
    const handler = createWhatsAppWebhookHandler({ getSecret: () => 'test-secret', getVerifyToken: () => 'verify', process });
    expect((await handler(new Request('https://example.test', { method: 'POST', body: bytes, headers: { 'X-Hub-Signature-256': sig } }))).status).toBe(400);
    expect(process).not.toHaveBeenCalled();
  });
  it('returns a processing error without falsely acknowledging completion', async () => {
    const handler = createWhatsAppWebhookHandler({ getSecret: () => 'test-secret', getVerifyToken: () => 'verify', process: async () => { throw new Error('db'); } });
    expect((await handler(new Request('https://example.test', { method: 'POST', body: '{}', headers: { 'X-Hub-Signature-256': await signature('{}') } }))).status).toBe(500);
  });
});
describe('WhatsApp sending defaults', () => {
  it.each([{}, { ...enabled, enabled: 'false' }, { ...enabled, enabled: 'TRUE' }, { ...enabled, provider: 'other' }, { ...enabled, accessToken: '' }, { ...enabled, phoneNumberId: '' }])('is inert with incomplete configuration %j', async config => {
    expect(isWhatsAppEnabled(config)).toBe(false);
    expect(await sendWhatsAppText(config, '447700900123', 'Test')).toEqual({ status: 'skipped' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses only an explicitly mocked transport and Graph v21.0', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'test-meta-id' }] })));
    expect(await sendWhatsAppText(enabled, '447700900123', 'Test reply', mockFetch)).toEqual({ status: 'sent', metaMessageId: 'test-meta-id' });
    expect(new URL(mockFetch.mock.calls[0][0]).pathname).toBe('/v21.0/test-number-id/messages');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not persist provider response diagnostics', async () => {
    await expect(sendWhatsAppText(enabled, '447700900123', 'Test', vi.fn().mockResolvedValue(new Response('sensitive', { status: 400 })))).rejects.toThrow('HTTP 400');
    await expect(sendWhatsAppText(enabled, 'invalid', 'Test', vi.fn())).rejects.toThrow('recipient');
  });
  it('closes the window exactly at 24 hours and rejects missing/future times', () => {
    const now = new Date('2026-10-17T12:00:00Z');
    expect(customerWindowOpen('2026-10-16T12:00:01Z', now)).toBe(true);
    for (const time of [null,'invalid','2026-10-16T12:00:00Z','2026-10-17T12:00:01Z']) expect(customerWindowOpen(time, now)).toBe(false);
  });
});

describe('future WhatsApp template consent gate', () => {
  const consent = { studentOptInAt: '2026-01-01T10:00:00Z', contactOptedOutAt: null, studentOptedOutAt: null, enabled: true };
  it('requires explicit recorded consent and enabled sending', () => {
    expect(canSendWhatsAppTemplate(consent)).toBe(true);
    for (const patch of [{ studentOptInAt: null }, { studentOptInAt: 'bad' }, { studentOptInAt: '2099-01-01' }, { contactOptedOutAt: '2026-10-01' }, { studentOptedOutAt: '2026-10-01' }, { enabled: false }]) expect(canSendWhatsAppTemplate({ ...consent, ...patch })).toBe(false);
  });
});
