// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateFileUpload } from './fileUpload';
import { pdfIntegrityCases } from '../../tests/fixtures/pdfIntegrity';

const options = { allowedMimeTypes: ['application/pdf'], allowedExtensions: ['pdf'] };

describe('client PDF upload validation', () => {
  it.each(pdfIntegrityCases)('$name', async ({ content, valid }) => {
    const file = new File([content], 'document.pdf', { type: 'application/pdf' });
    if (valid) {
      await expect(validateFileUpload(file, options)).resolves.toMatchObject({
        detectedMimeType: 'application/pdf',
      });
    } else {
      await expect(validateFileUpload(file, options)).rejects.toThrow(/truncated or corrupted/);
    }
  });

  it('rejects a non-PDF header even when an image MIME type is supplied', async () => {
    const file = new File(['invalid' + 'x'.repeat(250) + '%%EOF'], 'document.pdf', { type: 'image/png' });
    await expect(validateFileUpload(file, { allowedMimeTypes: ['image/png', 'application/pdf'] }))
      .rejects.toThrow(/invalid header/);
  });
});
