export async function verifyWhatsAppSignature(rawBody: ArrayBuffer | Uint8Array | string, signature: string | null, secret: string): Promise<boolean> {
  signature = signature?.toLowerCase() ?? null;
  if (!secret || !signature || !/^sha256=[0-9a-f]{64}$/.test(signature)) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody));
  const supplied = signature.slice(7);
  let difference = 0;
  for (let i = 0; i < digest.length; i++) difference |= digest[i] ^ parseInt(supplied.slice(i * 2, i * 2 + 2), 16);
  return difference === 0;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a), right = encoder.encode(b);
  let difference = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return difference === 0;
}
