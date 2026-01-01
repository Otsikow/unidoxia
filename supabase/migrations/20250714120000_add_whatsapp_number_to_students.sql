-- Add WhatsApp number to student profiles for direct messaging
alter table if exists public.students
  add column if not exists whatsapp_number text;

