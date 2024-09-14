import { kv } from '@vercel/kv'
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'

interface ResetPasswordRequest extends NextApiRequest {
  body: {
    token: string
    password: string
  }
}

interface ResetPasswordResponse {
  message: string
}

export default async function handler(
  req: ResetPasswordRequest,
  res: NextApiResponse<ResetPasswordResponse>
) {
  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).json({ message: 'Token și parola sunt necesare' })
  }

  try {
    const email = await kv.get<string | null>(`password-reset:${token}`)

    if (!email) {
      return res.status(400).json({ message: 'Token invalid sau expirat' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await kv.hset(`user:${email}`, { password: hashedPassword })

    await kv.del(`password-reset:${token}`)

    return res.status(200).json({ message: 'Parola resetată cu succes!' })
  } catch (error) {
    console.error('Error resetting password:', error)
    return res.status(500).json({ message: 'Eroare la resetarea parolei' })
  }
}
