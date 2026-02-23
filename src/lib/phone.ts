export interface CountryPhoneOption {
  country: string;
  flag: string;
  dialCode: string;
}

export const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [
  { country: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { country: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { country: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { country: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { country: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { country: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { country: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { country: 'Ireland', flag: '🇮🇪', dialCode: '+353' },
  { country: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { country: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
  { country: 'India', flag: '🇮🇳', dialCode: '+91' },
  { country: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { country: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971' },
  { country: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { country: 'France', flag: '🇫🇷', dialCode: '+33' },
  { country: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { country: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { country: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { country: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { country: 'Turkey', flag: '🇹🇷', dialCode: '+90' },
  { country: 'China', flag: '🇨🇳', dialCode: '+86' },
  { country: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { country: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { country: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
];

const defaultDialCode = '+44';

const dialCodeSorted = [...COUNTRY_PHONE_OPTIONS]
  .sort((a, b) => b.dialCode.length - a.dialCode.length)
  .map((option) => option.dialCode);

export const getDialCodeByCountry = (country?: string | null): string => {
  if (!country) return defaultDialCode;
  const countryNormalized = country.trim().toLowerCase();
  const match = COUNTRY_PHONE_OPTIONS.find((option) => option.country.toLowerCase() === countryNormalized);
  return match?.dialCode ?? defaultDialCode;
};

export const normalizeLocalPhoneNumber = (value: string): string =>
  value.replace(/[^0-9]/g, '').replace(/^0+/, '');

export const parseInternationalNumber = (value?: string | null): { dialCode: string; localNumber: string } => {
  if (!value) {
    return { dialCode: defaultDialCode, localNumber: '' };
  }

  const compact = value.replace(/\s+/g, '');
  if (!compact.startsWith('+')) {
    return {
      dialCode: defaultDialCode,
      localNumber: normalizeLocalPhoneNumber(compact),
    };
  }

  const dialCode = dialCodeSorted.find((code) => compact.startsWith(code));
  if (!dialCode) {
    return {
      dialCode: defaultDialCode,
      localNumber: normalizeLocalPhoneNumber(compact),
    };
  }

  return {
    dialCode,
    localNumber: normalizeLocalPhoneNumber(compact.slice(dialCode.length)),
  };
};

export const buildInternationalNumber = (dialCode: string, localNumber: string): string => {
  const cleanLocal = normalizeLocalPhoneNumber(localNumber);
  if (!dialCode || !cleanLocal) return '';
  return `${dialCode}${cleanLocal}`;
};

export const toWhatsAppLink = (internationalNumber: string): string => {
  const digits = internationalNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}`;
};

export const isLikelyValidInternational = (dialCode: string, localNumber: string): boolean => {
  const clean = normalizeLocalPhoneNumber(localNumber);
  if (!dialCode.startsWith('+')) return false;
  return clean.length >= 6 && clean.length <= 15;
};
