// Registered office and ICO number: Companies House company 16172129 (AD01 filed 19 October 2026) and ICO registration ZC277440.
// This is a registered office, not a promise of walk-in consultation availability.
const address = { streetAddress: '54 Blakey Close', addressLocality: 'Redcar', addressRegion: 'England', postalCode: 'TS10 4PB', addressCountry: 'GB' };
export const business = {
  name: 'UniDoxia',
  legalName: 'Global Talent Gateway Ltd',
  companyNumber: '16172129',
  icoRegistrationNumber: 'ZC277440',
  email: 'info@unidoxia.com',
  address,
  registeredOffice: `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion}, ${address.postalCode}`,
  addressSource: 'https://find-and-update.company-information.service.gov.uk/company/16172129',
};
export const businessFooter = `${business.name} is a trading name of ${business.legalName}, registered in England and Wales, company number ${business.companyNumber}. Registered office: ${business.registeredOffice}. ICO registration number: ${business.icoRegistrationNumber}.`;
