'use server'

import { signIn } from '@/auth'
import { User } from '@/lib/types'
import { AuthError } from 'next-auth'
import * as z from 'zod'
import { kv } from '@vercel/kv'
import { ResultCode } from '@/lib/utils'

interface Result {
  type: string
  resultCode: string
}

export async function getUser(email: string): Promise<User | null> {
  try {
    const user = await kv.hgetall<User>(`user:${email}`)
    console.log('User data fetched:', user ? user.email : 'Not Found')
    console.log(
      'Stored password hash:',
      user ? user.password : 'No password found'
    )
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
    const email = formData.get('email')
    const password = formData.get('password')

    const parsedCredentials = z
      .object({
        email: z.string().email(),
        password: z.string().min(6)
      })
      .safeParse({
        email,
        password
      })

    if (parsedCredentials.success) {
      await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      return {
        type: 'success',
        resultCode: ResultCode.UserLoggedIn
      }
    } else {
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            type: 'error',
            resultCode: ResultCode.InvalidCredentials
          }
        default:
          return {
            type: 'error',
            resultCode: ResultCode.UnknownError
          }
      }
    }
  }
}
