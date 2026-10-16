// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validatePdfIntegrity } from './pdfIntegrity';
import { pdfIntegrityCases } from '../../../tests/fixtures/pdfIntegrity';

describe('shared PDF integrity check', () => {
  it.each(pdfIntegrityCases)('$name', async ({ content, valid }) => {
    await expect(validatePdfIntegrity(new Blob([content]))).resolves.toBe(valid);
  });

  it('checks the whole file when it is shorter than the header', async () => {
    await expect(validatePdfIntegrity(new Blob(['%PDF']))).resolves.toBe(false);
  });

  it('rejects unreadable files', async () => {
    const file = { size: 1000, slice: () => { throw new Error('Read failed'); } } as unknown as Blob;
    await expect(validatePdfIntegrity(file)).resolves.toBe(false);
  });
});
