import sgMail from '@sendgrid/mail'

export default async function sendPasswordResetEmail(email: string, resetLink: string) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not set in the environment variables')
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  const msg = {
    to: email,
    from: 'noreply@myvolt.io',
    subject: 'Password Reset Request',
    text: `You requested to reset your password. Use this link: ${resetLink}`,
    html: `<strong>You requested to reset your password.</strong><br>Use this link: <a href="${resetLink}">Reset Password</a>`
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
