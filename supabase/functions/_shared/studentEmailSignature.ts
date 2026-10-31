/** Public, fixed business identity. Keep past signature renderers for uncertain-email retries. */
export const STUDENT_EMAIL_SIGNATURE_V1 = `Best regards,
UniDoxia Team
International Student Recruitment & Application Support

Email: info@unidoxia.com
WhatsApp: +44 7360 961803
https://unidoxia.com

UniDoxia is a trading name of Global Talent Gateway Ltd.
Registered in England and Wales. Company number: 16172129.
Registered office: 54 Blakey Close, Redcar, England, TS10 4PB.
ICO registration: ZC277440.`;

export const STUDENT_EMAIL_SIGNATURE_HTML_V1 = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;color:#172033;font-family:Arial,Helvetica,sans-serif;line-height:1.5;text-align:left"><tr><td style="padding:20px 0 12px;border-top:3px solid #c49b3c"><p style="margin:0 0 12px;font-size:14px">Best regards,</p><a href="https://unidoxia.com" style="text-decoration:none"><img src="https://unidoxia.com/favicon-96.png" width="64" height="64" alt="UniDoxia" style="display:block;border:0;margin:0 0 10px"></a><p style="margin:0;font-size:19px;font-weight:bold;color:#12345b">UniDoxia Team</p><p style="margin:3px 0 12px;font-size:13px;color:#475569">International Student Recruitment &amp; Application Support</p><p style="margin:0 0 5px;font-size:14px"><a href="mailto:info@unidoxia.com" style="color:#12345b;text-decoration:underline">info@unidoxia.com</a></p><p style="margin:0 0 5px;font-size:14px">WhatsApp: <a href="https://wa.me/447360961803" style="color:#12345b;text-decoration:underline">+44 7360 961803</a></p><p style="margin:0;font-size:14px"><a href="https://unidoxia.com" style="color:#12345b;text-decoration:underline">unidoxia.com</a></p></td></tr><tr><td style="padding:12px 0 0;border-top:1px solid #d6dce5;font-size:11px;color:#475569">UniDoxia is a trading name of Global Talent Gateway Ltd.<br>Registered in England and Wales. Company number: 16172129.<br>Registered office: 54 Blakey Close, Redcar, England, TS10 4PB.<br>ICO registration: ZC277440.</td></tr></table>`;


/** Existing official destinations from the website's AppFooter. Use visible labels in email. */
export const STUDENT_EMAIL_SOCIAL_LINKS = [
  {label: "LinkedIn", url: "https://www.linkedin.com/company/110137778/"},
  {label: "Facebook", url: "https://www.facebook.com/profile.php?id=61584297605909"},
  {label: "Instagram", url: "https://www.instagram.com/unidoxia/"},
  {label: "TikTok", url: "https://www.tiktok.com/@unidoxia.com1"},
  {label: "X", url: "https://x.com/unidoxia"},
  {label: "Reddit", url: "https://www.reddit.com/r/UniDoxia"},
  {label: "WhatsApp Channel", url: "https://whatsapp.com/channel/0029Vawx2lA2kNFjQrxOc640"},
] as const;
const socialText = "Follow UniDoxia:\n" + STUDENT_EMAIL_SOCIAL_LINKS.map(({label,url}) => `${label}: ${url}`).join("\n");
export const STUDENT_EMAIL_SIGNATURE = STUDENT_EMAIL_SIGNATURE_V1.replace("\n\nUniDoxia is a trading name", `\n\n${socialText}\n\nUniDoxia is a trading name`);
const socialHtml = `<p style="margin:16px 0 6px;font-size:12px;font-weight:bold;color:#475569">Follow UniDoxia</p><p style="margin:0;font-size:13px;line-height:2">${STUDENT_EMAIL_SOCIAL_LINKS.map(({label,url}) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 12px 6px 0;color:#12345b;text-decoration:underline">${label}</a>`).join(" ")}</p>`;
export const STUDENT_EMAIL_SIGNATURE_HTML = STUDENT_EMAIL_SIGNATURE_HTML_V1.replace('</td></tr><tr>', `${socialHtml}</td></tr><tr>`);
