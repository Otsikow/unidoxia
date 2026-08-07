/**
 * Shared helpers for the student residential address captured at registration
 * and editable from the student profile.
 */

export interface ResidentialAddress {
  address_line_1: string;
  address_line_2: string;
  city: string;
  state_region: string;
  postal_code: string;
  country_of_residence: string;
}

export const EMPTY_RESIDENTIAL_ADDRESS: ResidentialAddress = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state_region: '',
  postal_code: '',
  country_of_residence: '',
};

/** Countries that do not operate a national postal / ZIP code system. */
const COUNTRIES_WITHOUT_POSTAL_CODES = new Set([
  'Angola',
  'Antigua and Barbuda',
  'Aruba',
  'Bahamas',
  'Belize',
  'Benin',
  'Bolivia',
  'Botswana',
  'Burkina Faso',
  'Burundi',
  'Cameroon',
  'Central African Republic',
  'Chad',
  'Comoros',
  'Congo',
  'Democratic Republic of the Congo',
  'Djibouti',
  'Dominica',
  'Equatorial Guinea',
  'Eritrea',
  'Fiji',
  'Gambia',
  'Ghana',
  'Grenada',
  'Guyana',
  'Hong Kong',
  'Ireland',
  'Jamaica',
  'Kiribati',
  'Libya',
  'Macau',
  'Malawi',
  'Mali',
  'Mauritania',
  'Nauru',
  'North Korea',
  'Qatar',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Samoa',
  'Sao Tome and Principe',
  'Seychelles',
  'Sierra Leone',
  'Solomon Islands',
  'Somalia',
  'South Sudan',
  'Suriname',
  'Syria',
  'Tanzania',
  'Timor-Leste',
  'Togo',
  'Tokelau',
  'Tonga',
  'Tuvalu',
  'Uganda',
  'United Arab Emirates',
  'Vanuatu',
  'Yemen',
  'Zimbabwe',
]);

/** Countries where a state / region / province is not normally part of an address. */
const COUNTRIES_WITHOUT_STATES = new Set([
  'Andorra',
  'Bahrain',
  'Hong Kong',
  'Iceland',
  'Kuwait',
  'Liechtenstein',
  'Luxembourg',
  'Macau',
  'Malta',
  'Monaco',
  'Qatar',
  'San Marino',
  'Singapore',
  'Vatican City',
]);

export const postalCodeRequired = (country: string) =>
  Boolean(country) && !COUNTRIES_WITHOUT_POSTAL_CODES.has(country);

export const stateRegionRequired = (country: string) =>
  Boolean(country) && !COUNTRIES_WITHOUT_STATES.has(country);

export const trimAddress = (address: ResidentialAddress): ResidentialAddress => ({
  address_line_1: address.address_line_1.trim(),
  address_line_2: address.address_line_2.trim(),
  city: address.city.trim(),
  state_region: address.state_region.trim(),
  postal_code: address.postal_code.trim(),
  country_of_residence: address.country_of_residence.trim(),
});

export type ResidentialAddressErrors = Partial<Record<keyof ResidentialAddress, string>>;

export const validateResidentialAddress = (
  address: ResidentialAddress,
): ResidentialAddressErrors => {
  const value = trimAddress(address);
  const errors: ResidentialAddressErrors = {};

  if (!value.country_of_residence) {
    errors.country_of_residence = 'Please select your country of residence.';
  }

  if (!value.address_line_1) {
    errors.address_line_1 = 'Please enter your street address.';
  } else if (value.address_line_1.length < 3) {
    errors.address_line_1 = 'Please enter a complete street address.';
  }

  if (!value.city) {
    errors.city = 'Please enter your city or town.';
  }

  if (stateRegionRequired(value.country_of_residence) && !value.state_region) {
    errors.state_region = 'Please enter your state, region or province.';
  }

  if (postalCodeRequired(value.country_of_residence) && !value.postal_code) {
    errors.postal_code = 'Please enter your postal or ZIP code.';
  }

  return errors;
};

/** Human-readable single line, or a friendly fallback for students with no address yet. */
export const formatResidentialAddress = (
  address: Partial<ResidentialAddress> | null | undefined,
): string => {
  if (!address) return 'Address not provided';

  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state_region,
    address.postal_code,
    address.country_of_residence,
  ]
    .map((part) => (part || '').trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Address not provided';
};
