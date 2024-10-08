import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'
import sendPasswordResetEmail from '@/lib/send-email'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ message: 'Email-ul este necesar' }, { status: 400 })
  }

  try {
    const user = await kv.hgetall(`user:${email}`)
    if (!user) {
      return NextResponse.json({ message: 'User-ul nu a fost gasit!' }, { status: 404 })
    }

    const token = uuidv4()
    const expirationTime = 60 * 60 * 24
    await kv.set(`password-reset:${token}`, email, { ex: expirationTime })

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`
    await sendPasswordResetEmail(email, resetLink)

    return NextResponse.json({ message: 'Email-ul pentru resetarea parolei a fost trimis cu succes!' }, { status: 200 })
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return NextResponse.json({ message: 'Ooops! A aparut o eroare la trimiterea emailului. Va rugam incercati din nou!' }, { status: 500 })
  }
}
