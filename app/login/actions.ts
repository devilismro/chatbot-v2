'use server'

import { signIn } from '@/auth'
import { User } from '@/lib/types'
import { kv } from '@vercel/kv'
import { z } from 'zod'
import { ResultCode } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

interface Result {
  type: string
  resultCode: ResultCode
}

// Fetch user details from KV database
export async function getUser(email: string): Promise<User | null> {
  try {
    const user = await kv.hgetall<User>(`user:${email}`)
    console.log(`Fetched user: ${user ? email : 'Not Found'}`)
    return user
  } catch (error) {
    console.error(`Error fetching user with email ${email}:`, error)
    return null
  }
}

// Authenticate the user by checking email and password
export async function authenticate(
  _prevState: Result | undefined,
  formData: FormData
): Promise<Result | undefined> {
  try {
    const email = formData.get('email')?.toString()
    const password = formData.get('password')?.toString()

    console.log('Authenticating user:', email)

    if (!email || !password) {
      console.log('Missing email or password')
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }

    // Fetch the user from KV
    const user = await getUser(email)
    if (!user || !user.password) {
      console.log('User not found or no password')
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }

    // Compare the entered password with the hashed password in KV
    const isPasswordValid = await bcrypt.compare(password, user.password)
    console.log('Password validation:', isPasswordValid)

    if (!isPasswordValid) {
      console.log('Password is invalid')
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }

    console.log('User authenticated, signing in...')
    // Sign the user in
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

// Handle request for password reset
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  try {
    console.log('Requesting password reset for email:', email)

    const user = await getUser(email)
    if (!user) {
      console.log('User not found for password reset')
      return { message: 'User not found' }
    }

    // Generate reset token and expiration time (1 day)
    const token = uuidv4()
    const expirationTime = 60 * 60 * 24
    await kv.set(`password-reset:${token}`, email, { ex: expirationTime })
    console.log(`Password reset token generated: ${token}`)

    // Send reset link via email
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`
    await sendPasswordResetEmail(email, resetLink)

    console.log('Password reset email sent successfully')
    return { message: 'Password reset email sent' }
  } catch (error) {
    console.error('Error requesting password reset:', error)
    throw error
  }
}

// Simulated send password reset email function (replace this with your actual email sending logic)
async function sendPasswordResetEmail(email: string, resetLink: string) {
  // Here, you would add logic to send an email via your chosen email service.
  console.log(`Sending password reset email to ${email} with link: ${resetLink}`)
}
