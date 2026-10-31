import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveApplicationDocuments } from './applicationDocuments';

const fake = vi.hoisted(() => ({
  read: vi.fn(), insert: vi.fn(), upload: vi.fn(), download: vi.fn(), remove: vi.fn(), bucket: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ select: () => ({ eq: fake.read }), insert: fake.insert }),
  storage: { from: (name: string) => { fake.bucket(name); return { upload: fake.upload, download: fake.download, remove: fake.remove }; } },
} }));
const file = () => new File(['test'], 'passport.pdf', { type: 'application/pdf' });
const row = (type: string, path = `app/${type}_saved`) => ({ document_type: type, storage_path: path });

beforeEach(() => {
  vi.resetAllMocks();
  fake.read.mockResolvedValue({ data: [], error: null });
  fake.upload.mockResolvedValue({ error: null });
  fake.insert.mockResolvedValue({ error: null });
  fake.remove.mockResolvedValue({ error: null });
});
describe('application document persistence', () => {
  it('does not claim completion after an upload fails', async () => {
    fake.upload.mockResolvedValue({ error: { message: 'network failed' } });
    await expect(saveApplicationDocuments('app', [{ type: 'passport', file: file() }])).rejects.toThrow('Could not upload passport');
    expect(fake.insert).not.toHaveBeenCalled();
    expect(fake.read).toHaveBeenCalledTimes(1);
  });
  it('rejects record errors and removes only the newly uploaded unlinked file', async () => {
    fake.insert.mockResolvedValue({ error: { message: 'permission denied', code: '42501' } });
    await expect(saveApplicationDocuments('app', [{ type: 'passport', file: file() }])).rejects.toThrow('Could not save passport');
    expect(fake.remove).toHaveBeenCalledWith([fake.upload.mock.calls[0][0]]);
    expect(fake.read).toHaveBeenCalledTimes(1);
  });
  it('keeps an uploaded file when the record response is lost, because it may already be linked', async () => {
    fake.insert.mockResolvedValue({ error: { message: 'Failed to fetch' } });
    await expect(saveApplicationDocuments('app', [{ type: 'passport', file: file() }])).rejects.toThrow();
    expect(fake.remove).not.toHaveBeenCalled();
  });
  it('resumes interrupted uploads without duplicating saved documents', async () => {
    fake.read.mockResolvedValueOnce({ data: [row('passport')], error: null })
      .mockResolvedValueOnce({ data: [row('passport'), row('transcript')], error: null });
    await saveApplicationDocuments('app', [{ type: 'passport', file: null }, { type: 'transcript', file: file() }]);
    expect(fake.upload).toHaveBeenCalledTimes(1);
    expect(fake.insert.mock.calls[0][0]).toMatchObject({ document_type: 'transcript', verified: false });
    expect(fake.read).toHaveBeenCalledTimes(2);
  });
  it('stores passport photos using the supported enum and verifies the exact saved kind', async () => {
    fake.read.mockResolvedValueOnce({ data: [row('other', 'app/offer_letter')], error: null })
      .mockResolvedValueOnce({ data: [row('other', 'app/passport_photo_saved')], error: null });
    await saveApplicationDocuments('app', [{ type: 'passport_photo', file: file() }]);
    expect(fake.insert.mock.calls[0][0]).toMatchObject({ document_type: 'other', verified: false });
    expect(fake.upload.mock.calls[0][0]).toContain('/passport_photo_');
  });
  it('fails when a reused student file cannot be downloaded', async () => {
    fake.download.mockResolvedValue({ data: null, error: { message: 'missing' } });
    await expect(saveApplicationDocuments('app', [{ type: 'passport', file: null, existing: { storage_path: 'student/passport.pdf', mime_type: 'application/pdf' } }])).rejects.toThrow('Could not reuse passport');
    expect(fake.upload).not.toHaveBeenCalled();
  });
  it('requires read-back evidence before reporting success', async () => {
    await expect(saveApplicationDocuments('app', [{ type: 'passport', file: file() }])).rejects.toThrow('Some documents have not been saved');
    expect(fake.insert).toHaveBeenCalledTimes(1);
  });
  it('does not trust a client-side document verification result', async () => {
    fake.read.mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: [row('passport')], error: null });
    await saveApplicationDocuments('app', [{ type: 'passport', file: file() }]);
    expect(fake.insert.mock.calls[0][0]).toMatchObject({ verified: false });
    expect(fake.insert.mock.calls[0][0]).not.toHaveProperty('verification_status');
  });
});
