import sgMail from '@sendgrid/mail'

const SENDGRID_API_KEY =
  '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'
export async function sendPasswordResetEmail(email: string, resetLink: string) {
  sgMail.setApiKey(SENDGRID_API_KEY)

  const msg = {
    to: email,
    from: 'noreply@myvolt.io',
    subject: 'Solicitare de resetare a parolei',
    text: `Ai solicitat resetarea parolei. Accesează următorul link pentru a reseta parola: ${resetLink}`,
    html: `<strong>Ai solicitat resetarea parolei. Accesează următorul link pentru a reseta parola:</strong><br><a href="${resetLink}">Resetează Parola</a><br><br>Cu stimă, echipa Chatbot Codul Muncii`
  }

  try {
    await sgMail.send(msg)
  } catch (error: any) {
    console.error(error.response.body.errors) 
  }
}
