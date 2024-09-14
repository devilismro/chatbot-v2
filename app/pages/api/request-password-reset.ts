import { NextApiRequest, NextApiResponse } from 'next'
import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'
import sendPasswordResetEmail from '@/lib/send-email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  try {
    const user = await kv.hgetall(`user:${email}`)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const token = uuidv4()
    const expirationTime = 60 * 60 * 24 
    await kv.set(`password-reset:${token}`, email, { ex: expirationTime })

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`
    await sendPasswordResetEmail(email, resetLink)

    return res.status(200).json({ message: 'Password reset email sent' })
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return res.status(500).json({ message: 'Error sending password reset email' })
  }
}
