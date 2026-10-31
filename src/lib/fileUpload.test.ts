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

import { vi } from 'vitest';
import { verifyUploadedFileSize } from './fileUpload';

describe('upload storage confirmation', () => {
  it('matches the exact object instead of the first substring search result', async () => {
    const list = vi.fn().mockResolvedValue({ data: [{ name: 'scan.pdf.old', metadata: { size: 1 } }, { name: 'scan.pdf', metadata: { size: 4 } }], error: null });
    const client = { storage: { from: () => ({ list }) } };
    expect(await verifyUploadedFileSize(client, 'student-documents', 'student/scan.pdf', 4)).toMatchObject({ valid: true, actualSize: 4 });
  });
  it('falls back to downloading the exact file when listing metadata is unavailable', async () => {
    const list = vi.fn().mockResolvedValue({ data: [{ name: 'scan.pdf', metadata: {} }], error: null });
    const download = vi.fn().mockResolvedValue({ data: new Blob(['test']), error: null });
    const client = { storage: { from: () => ({ list, download }) } };
    expect(await verifyUploadedFileSize(client, 'student-documents', 'student/scan.pdf', 4)).toMatchObject({ valid: true });
    expect(download).toHaveBeenCalledWith('student/scan.pdf');
  });
  it('accepts a genuine JPEG even when the phone leaves its MIME type blank', async () => {
    const file = new File([new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70])], 'photo.JPG', { type: '' });
    expect(await validateFileUpload(file, { allowedMimeTypes: ['image/jpeg'], allowedExtensions: ['jpg'] })).toMatchObject({ detectedMimeType: 'image/jpeg' });
  });
  it('does not treat a valid PDF filename containing expired or invalid as evidence against the file', async () => {
    const file = new File(['%PDF-1.7\n' + 'x'.repeat(250) + '%%EOF'], 'expired-passport-invalid-copy.pdf', { type: '' });
    await expect(validateFileUpload(file, options)).resolves.toMatchObject({ detectedMimeType: 'application/pdf' });
  });
});
