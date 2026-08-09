-- Passport OCR fields are stored on the student record and are written only after
-- the student reviews and confirms the extracted values in the client UI.
alter table public.students
  add column if not exists passport_ocr_status text
    check (passport_ocr_status in ('pending_review', 'confirmed', 'needs_review')),
  add column if not exists passport_ocr_confidence numeric
    check (passport_ocr_confidence is null or (passport_ocr_confidence >= 0 and passport_ocr_confidence <= 1)),
  add column if not exists passport_ocr_processed_at timestamptz;

comment on column public.students.passport_ocr_status is
  'Status of passport OCR extraction; never treated as identity verification.';
comment on column public.students.passport_ocr_confidence is
  'Model confidence for the extraction, not a verification score.';
