-- Allow signed declaration forms on application documents without changing existing values.
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'signed_declaration_form';
