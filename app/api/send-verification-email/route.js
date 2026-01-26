import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email, displayName, verificationLink } = await request.json();

    const { data, error } = await resend.emails.send({
      from: 'CareConnect <onboarding@resend.dev>', // Később módosítsd saját domain-re
      to: [email],
      subject: 'Erősítsd meg az email címedet - CareConnect',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: #ffffff;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #7c3aed;
                margin-bottom: 10px;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 14px;
                color: #666;
                border-top: 1px solid #eee;
                padding-top: 20px;
              }
              .link {
                color: #667eea;
                word-break: break-all;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">CareConnect</div>
                <p style="color: #666; margin: 0;">Pharmagister Platform</p>
              </div>
              
              <h2 style="color: #333; margin-bottom: 20px;">Szia ${displayName || 'Felhasználó'}! 👋</h2>
              
              <p>Köszönjük, hogy regisztráltál a CareConnect Pharmagister platformon!</p>
              
              <p>Kérjük, erősítsd meg az email címedet az alábbi gombra kattintva:</p>
              
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">
                  ✅ Email cím megerősítése
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Ha a gomb nem működik, másold be ezt a linket a böngésződbe:
              </p>
              <p style="font-size: 12px;">
                <a href="${verificationLink}" class="link">${verificationLink}</a>
              </p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Az aktiválás után már teljes mértékben használhatod a rendszert és hozzáférhetsz az összes funkcióhoz.
              </p>
              
              <div class="footer">
                <p>Ha nem te regisztráltál, kérjük, hagyd figyelmen kívül ezt az emailt.</p>
                <p style="margin-top: 15px; font-weight: 600;">Üdvözlettel,<br>A CareConnect csapata</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      emailId: data?.id,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: error.message 
    }, { status: 500 });
  }
}
