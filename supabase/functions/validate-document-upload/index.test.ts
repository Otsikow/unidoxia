// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { pdfIntegrityCases } from '../../../tests/fixtures/pdfIntegrity.ts';

const { list, download } = vi.hoisted(() => ({ list: vi.fn(), download: vi.fn() }));
vi.mock('https://esm.sh/@supabase/supabase-js@2.110.2', () => ({
  createClient: () => ({ storage: { from: () => ({ list, download }) } }),
}));

let handler: (request: Request) => Promise<Response>;
beforeAll(async () => {
  vi.stubGlobal('Deno', {
    env: { get: () => 'test-placeholder' },
    serve: (callback: typeof handler) => { handler = callback; },
  });
  await import('./index');
});
afterAll(() => { vi.unstubAllGlobals(); });

describe('server PDF upload validation', () => {
  it.each(pdfIntegrityCases)('$name', async ({ content, valid }: { content: BlobPart; valid: boolean }) => {
    const file = new Blob([content]);
    list.mockResolvedValue({ data: [{ metadata: { size: file.size } }], error: null });
    download.mockResolvedValue({ data: file, error: null });
    const response = await handler(new Request('https://example.test/validate-document-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: 'documents', path: 'document.pdf', expectedSize: file.size, expectedMimeType: 'application/pdf' }),
    }));
    expect(response.status).toBe(valid ? 200 : 400);
    expect(await response.json()).toMatchObject({ valid });
  });
});
