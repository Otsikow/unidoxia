// Registered office checked against Companies House company 16172129 on 23 October 2026.
// This is a registered office, not a promise of walk-in consultation availability.
const address = { streetAddress: 'Office 10 Seagreen Turner Street', addressLocality: 'Redcar', addressRegion: 'England', postalCode: 'TS10 1AZ', addressCountry: 'GB' };
export const business = {
  name: 'UniDoxia',
  legalName: 'Global Talent Gateway Ltd',
  companyNumber: '16172129',
  email: 'info@unidoxia.com',
  address,
  registeredOffice: `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion}, ${address.postalCode}`,
  addressSource: 'https://find-and-update.company-information.service.gov.uk/company/16172129',
};
export const businessFooter = `${business.name} is a trading name of ${business.legalName}, registered in England and Wales, company number ${business.companyNumber}. Registered office: ${business.registeredOffice}.`;
