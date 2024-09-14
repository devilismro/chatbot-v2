import { kv } from '@vercel/kv'
import type { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4 } from 'uuid'

interface RequestPasswordResetRequest extends NextApiRequest {
  body: {
    email: string
  }
}

interface RequestPasswordResetResponse {
  message: string
}

async function sendPasswordResetEmail(email: string, resetLink: string) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not set in the environment variables')
  }

  const sgMail = (await import('@sendgrid/mail')).default
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
    if (error.response && error.response.body && error.response.body.errors) {
      console.error(error.response.body.errors)
    } else {
      console.error('Error sending email:', error)
    }
  }
}

export default async function handler(
  req: RequestPasswordResetRequest,
  res: NextApiResponse<RequestPasswordResetResponse>
) {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: 'Email este necesar' })
  }

  try {
    const token = uuidv4()
    const expirationTime = 60 * 60 * 24 

    await kv.set(`password-reset:${token}`, email, { ex: expirationTime })

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`

    await sendPasswordResetEmail(email, resetLink)

    return res.status(200).json({ message: 'Link-ul pentru resetarea parolei a fost trimis' })
  } catch (error) {
    console.error('Error processing password reset request:', error)
    return res.status(500).json({ message: 'Eroare la solicitarea resetării parolei' })
  }
}
