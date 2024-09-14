import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { getStringFromBuffer } from '@/lib/utils'

export async function POST(req: Request) {
  const { token, password } = await req.json()

  if (!token || !password) {
    return NextResponse.json(
      { message: 'Token și parola sunt necesare' },
      { status: 400 }
    )
  }

  try {
    const email = await kv.get<string | null>(`password-reset:${token}`)
    if (!email) {
      return NextResponse.json(
        { message: 'Token invalid sau expirat' },
        { status: 400 }
      )
    }

    const salt = crypto.randomUUID()
    const encoder = new TextEncoder()
    const saltedPassword = encoder.encode(password + salt)
    const hashedPasswordBuffer = await crypto.subtle.digest('SHA-256', saltedPassword)
    const hashedPassword = getStringFromBuffer(hashedPasswordBuffer)
    console.log('Hashed password being saved:', hashedPassword)

    await kv.hset(`user:${email}`, { password: hashedPassword, salt: salt })
    console.log('Password and salt updated in KV for user:', email)

    await kv.del(`password-reset:${token}`)
    console.log('Reset token deleted')

    return NextResponse.json(
      { message: 'Parola resetată cu succes!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { message: 'Eroare la resetarea parolei' },
      { status: 500 }
    )
  }
}
