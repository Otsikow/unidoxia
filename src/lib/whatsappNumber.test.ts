import { describe, expect, it } from 'vitest';
import { getWhatsAppFieldState, resolveWhatsAppNumber } from './whatsappNumber';

describe('optional WhatsApp number', () => {
  it('uses the mobile number by default and allows a separate optional number', () => {
    expect(getWhatsAppFieldState('+44 7123 456789', null)).toEqual({
      sameAsMobile: true,
      whatsappNumber: '',
    });
    expect(resolveWhatsAppNumber('+44 7123 456789', '', true)).toBe('+44 7123 456789');
    expect(resolveWhatsAppNumber('+44 7123 456789', '+233 20 123 4567', false)).toBe('+233 20 123 4567');
    expect(resolveWhatsAppNumber('+44 7123 456789', '', false)).toBeNull();
  });
});
