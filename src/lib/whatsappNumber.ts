const normalisePhone = (value: string) => value.replace(/[\s()-]/g, '');

export const getWhatsAppFieldState = (mobileNumber: string, whatsappNumber: string | null | undefined) => {
  const storedNumber = whatsappNumber?.trim() || '';
  return {
    sameAsMobile: !storedNumber || normalisePhone(storedNumber) === normalisePhone(mobileNumber),
    whatsappNumber: storedNumber,
  };
};

export const resolveWhatsAppNumber = (
  mobileNumber: string,
  whatsappNumber: string,
  sameAsMobile: boolean,
) => (sameAsMobile ? mobileNumber.trim() : whatsappNumber.trim()) || null;
