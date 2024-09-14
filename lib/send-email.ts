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
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #000;">Cerere de Resetare a Parolei</h2>
        <p>Ai solicitat resetarea parolei pentru contul tău. Pentru a finaliza procesul de resetare, te rugăm să accesezi linkul de mai jos:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #007BFF; text-decoration: none; border-radius: 5px; font-weight: bold;">Resetează Parola</a>
        <p>Dacă nu ai solicitat această acțiune, poți ignora acest email și nu vor fi efectuate modificări în contul tău.</p>
        <br />
        <p>Cu stimă,<br />Echipa MyVolt</p>
      </div>
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
