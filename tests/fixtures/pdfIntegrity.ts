const body = '%PDF-1.7\n' + 'x'.repeat(1200);

export const pdfIntegrityCases = [
  { name: 'plain end marker', content: body + '%%EOF', valid: true },
  { name: 'end marker followed by CRLF and spaces', content: body + '%%EOF\r\n   ', valid: true },
  { name: 'end marker followed by null padding', content: body + '%%EOF\0\0\0', valid: true },
  { name: 'incremental update with two end markers', content: body + '%%EOF\n' + 'x'.repeat(1100) + '\n%%EOF', valid: true },
  { name: 'end marker 500 bytes before the end', content: body + '%%EOF' + '\0'.repeat(500), valid: true },
  { name: 'end marker starting exactly 1024 bytes from the end', content: body + '%%EOF' + 'x'.repeat(1019), valid: true },
  { name: 'PDF smaller than 1024 bytes', content: '%PDF-1.7\n' + 'x'.repeat(250) + '%%EOF', valid: true },
  { name: 'truncated PDF without an end marker', content: body, valid: false },
  { name: 'only end marker more than 1024 bytes from the end', content: body + '%%EOF' + 'x'.repeat(1024), valid: false },
  { name: 'end marker crossing the 1024 byte boundary', content: body + '%%EOF' + 'x'.repeat(1020), valid: false },
  { name: 'non-PDF header', content: 'invalid!\n' + 'x'.repeat(1200) + '%%EOF', valid: false },
  { name: 'PDF header missing the hyphen', content: '%PDFx1.7\n' + 'x'.repeat(1200) + '%%EOF', valid: false },
];
