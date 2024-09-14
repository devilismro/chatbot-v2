import sgMail from '@sendgrid/mail'

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not set in the environment variables')
  }
  
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
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
