import { checked, type WhatsAppDatabase } from './whatsappStore.ts';
import { whatsappCors } from './whatsappReplyHandler.ts';
export const ZOE_FALLBACK = "Sorry, we couldn't copy your chat across this time. You can still message us on WhatsApp, or email info@unidoxia.com.";
export const ZOE_FALLBACK_MESSAGE = 'Hi UniDoxia, I was chatting with Zoe on your website.';
export function createZoeHandoffHandler(db: WhatsAppDatabase, salt?: string) {
  return async (req: Request): Promise<Response> => {
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...whatsappCors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: whatsappCors });
    if (req.method !== 'POST') return json({ error: ZOE_FALLBACK }, 405);
    try {
      const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0])?.trim();
      if (!salt || !ip) return json({ error: ZOE_FALLBACK }, 503);
      if (Number(req.headers.get('content-length')) > 16384) return json({ error: ZOE_FALLBACK }, 413);
      const body = await req.text();
      if (body.length > 16384) return json({ error: ZOE_FALLBACK }, 413);
      const { summary } = JSON.parse(body);
      if (typeof summary !== 'string') return json({ error: ZOE_FALLBACK }, 400);
      let userId: string | null = null;
      const authorization = req.headers.get('authorization');
      const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
      if (authorization && !token) return json({ error: ZOE_FALLBACK }, 401);
      if (token) {
        const { data, error } = await db.auth.getUser(token);
        if (error || !data.user) return json({ error: ZOE_FALLBACK }, 401);
        userId = data.user.id;
      }
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}\n${ip}`));
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
      const ref = checked(await db.rpc('whatsapp_create_zoe_handoff_secure', { p_summary: summary, p_ip_hash: hash, p_user: userId }));
      return ref ? json({ ref }) : json({ error: ZOE_FALLBACK }, 429);
    } catch { return json({ error: ZOE_FALLBACK }, 503); }
  };
}
