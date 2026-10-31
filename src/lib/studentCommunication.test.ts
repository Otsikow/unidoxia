import { describe, expect, it } from 'vitest';
import { registeredWhatsApp,whatsAppLink,communicationTemplate,studentContactSearch } from './studentCommunication';
describe('student communication content and destination selection',()=>{
 it('uses registered WhatsApp and never guesses from a general contact phone',()=>{
  expect(registeredWhatsApp({whatsapp_number:'+233 50 123 4567',address:{whatsapp:'+447700900123'}})).toBe('233501234567');
  expect(registeredWhatsApp({whatsapp_number:null,address:null})).toBeNull();
  expect(registeredWhatsApp({whatsapp_number:'invalid',address:{whatsapp:'+447700900123'}})).toBeNull();
 });
 it('accepts legacy explicitly registered WhatsApp but rejects local or malformed values',()=>{
  expect(registeredWhatsApp({address:{whatsapp:'0044 (7700) 900-123'}})).toBe('447700900123');
  for(const value of ['0501234567','call +233501234567','+123','+44 7700 900123 ext 5'])expect(registeredWhatsApp({whatsapp_number:value})).toBeNull();
 });
 it('encodes personalised names and application references without inventing outcomes',()=>{
  const student={id:'one',legal_name:'Ama & Kofi',whatsapp_number:'+233501234567'};
  const draft=communicationTemplate('update',student,{id:'app',app_number:'UDX-123',program:{name:'Computing',university:{name:'Sample University'}}});
  expect(draft.body).toContain('Ama & Kofi');expect(draft.body).toContain('UDX-123');expect(draft.body).not.toContain('successfully submitted to');
  expect(new URL(whatsAppLink(student,draft.body)!).searchParams.get('text')).toBe(draft.body);
 });
 it('quotes search punctuation so it remains a search value',()=>{
  const filter=studentContactSearch('Ama, (Kofi) "x"');
  expect(filter).toContain('legal_name.ilike."%Ama, (Kofi) \\"x\\"%"');
  expect(studentContactSearch('100%')).toContain('100\\\\%');
 });
});
