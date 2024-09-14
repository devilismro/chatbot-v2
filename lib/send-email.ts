import sgMail from '@sendgrid/mail'

export default async function sendPasswordResetEmail(
  email: string,
  resetLink: string
) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not set in the environment variables')
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  const msg = {
    to: email,
    from: 'noreply@myvolt.io',
    subject: 'Cerere de Resetare a Parolei',
    text: `Ai solicitat resetarea parolei. Folosește acest link: ${resetLink} pentru a reseta parola.`,
    html: `
      <!DOCTYPE html>
      <html lang="ro">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cerere de Resetare a Parolei</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <tr>
                  <td style="padding: 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                              <td align="center" style="padding-bottom: 30px;">
                                  <img src="/api/placeholder/200/80" alt="ChatBot Codul Muncii Logo" style="max-width: 200px; height: auto;">
                              </td>
                          </tr>
                          <tr>
                              <td>
                                  <h2 style="color: #007BFF; font-size: 24px; margin-bottom: 20px; text-align: center;">Cerere de Resetare a Parolei</h2>
                                  <p style="margin-bottom: 20px;">Dragă utilizator,</p>
                                  <p style="margin-bottom: 20px;">Ai solicitat resetarea parolei pentru contul tău ChatBot Codul Muncii. Pentru a finaliza procesul de resetare, te rugăm să accesezi butonul de mai jos:</p>
                                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                      <tr>
                                          <td align="center" style="padding: 20px 0;">
                                              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; color: white; background-color: #007BFF; text-decoration: none; border-radius: 5px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; transition: background-color 0.3s ease;">Resetează Parola</a>
                                          </td>
                                      </tr>
                                  </table>
                                  <p style="margin-bottom: 20px;">Dacă nu ai solicitat această acțiune, poți ignora acest email și nu vor fi efectuate modificări în contul tău. Pentru siguranța contului tău, te rugăm să nu distribui acest link nimănui.</p>
                                  <p style="margin-bottom: 20px;">Dacă întâmpini probleme cu resetarea parolei sau ai alte întrebări, nu ezita să contactezi echipa noastră de suport.</p>
                                  <p style="margin-bottom: 5px;">Cu stimă,</p>
                                  <p style="font-weight: bold;">Echipa ChatBot Codul Muncii</p>
                              </td>
                          </tr>
                          <tr>
                              <td style="padding-top: 30px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; text-align: center;">
                                  <p>&copy; 2024 ChatBot Codul Muncii. Toate drepturile rezervate.</p>
                                  <p>Acest email a fost trimis către ${email}. Te rugăm să nu răspunzi la acest email.</p>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `
  }

  try {
    await sgMail.send(msg)
  } catch (error: any) {
    if (error.response && error.response.body && error.response.body.errors) {
      console.error(error.response.body.errors)
    } else {
      console.error('Error sending email:', error)
    }
  }
}
