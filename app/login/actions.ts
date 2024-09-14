'use server'

import { signIn } from '@/auth'
import { User } from '@/lib/types'
import { kv } from '@vercel/kv'
import bcrypt from 'bcryptjs'
import { ResultCode } from '@/lib/utils'

interface Result {
  type: string
  resultCode: string
}

export async function getUser(email: string): Promise<User | null> {
  try {
    const user = await kv.hgetall<User>(`user:${email}`)
    console.log('User data fetched:', user ? user.email : 'Not Found')
    console.log('Stored password hash:', user ? user.password : 'No password found')
    return user
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function authenticate(
  _prevState: Result | undefined,
  formData: FormData
): Promise<Result | undefined> {
  try {
    const email = formData.get('email')?.toString()
    const password = formData.get('password')?.toString()

    console.log('Attempting login for email:', email)

    if (!email || !password) {
      console.log('Missing email or password')
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }

    const user = await getUser(email)
    if (!user || !user.password) {
      console.log('User not found or no password in KV')
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }

    console.log('Comparing entered password with stored hash...')
    const isPasswordValid = await bcrypt.compare(password, user.password)
    console.log('Password comparison result:', isPasswordValid)

    if (!isPasswordValid) {
      console.log('Password is invalid')
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }

    console.log('User authenticated, signing in...')
    await signIn('credentials', {
      email,
      password,
      redirect: false
    })

    return {
      type: 'success',
      resultCode: ResultCode.UserLoggedIn
    }
  } catch (error) {
    console.error('Error during authentication:', error)
    return {
      type: 'error',
      resultCode: ResultCode.UnknownError
    }
  }
}
