-- Update the password recovery email template to reflect UniDoxia messaging
-- and ensure no third-party branding appears in customer emails.
INSERT INTO auth.email_templates (template_name, subject, content)
VALUES (
  'recovery',
  'Reset your UniDoxia password',
  $$
  <!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        :root {
          color-scheme: light dark;
          supported-color-schemes: light dark;
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background-color:#f5f7fb; font-family:Arial, sans-serif; color:#0f172a;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f7fb; padding:24px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff; border-radius:12px; padding:32px; box-shadow:0 10px 25px rgba(15, 23, 42, 0.08);">
              <tr>
                <td>
                  <h1 style="margin:0 0 16px; font-size:24px; font-weight:700; color:#111827;">Reset your password</h1>
                  <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#1f2937;">
                    You recently requested to reset your UniDoxia password. Click the button below to choose a new one.
                  </p>
                  <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">
                    If you did not make this request, you can safely ignore this email.
                  </p>
                  <p style="margin:0 0 32px; text-align:center;">
                    <a href="{{ .ActionLink }}" style="display:inline-block; padding:14px 22px; background-color:#2563eb; color:#ffffff; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">Reset Password</a>
                  </p>
                  <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 20px;" />
                  <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                    UniDoxia — Your gateway to global education.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  $$
)
ON CONFLICT (template_name)
DO UPDATE SET
  subject = EXCLUDED.subject,
  content = EXCLUDED.content;
