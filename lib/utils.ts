import { clsx, type ClassValue } from 'clsx'
import { customAlphabet } from 'nanoid'
import { twMerge } from 'tailwind-merge'
import { NextApiRequest } from 'next'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7
)

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init)

  if (!res.ok) {
    const json = await res.json()
    if (json.error) {
      const error = new Error(json.error) as Error & {
        status: number
      }
      error.status = res.status
      throw error
    } else {
      throw new Error('An unexpected error occurred')
    }
  }

  return res.json()
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)

export const runAsyncFnWithoutBlocking = (
  fn: (...args: any) => Promise<any>
) => {
  fn()
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const getStringFromBuffer = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

export enum ResultCode {
  InvalidCredentials = 'INVALID_CREDENTIALS',
  InvalidSubmission = 'INVALID_SUBMISSION',
  UserAlreadyExists = 'USER_ALREADY_EXISTS',
  UnknownError = 'UNKNOWN_ERROR',
  UserCreated = 'USER_CREATED',
  UserLoggedIn = 'USER_LOGGED_IN',
  UserNotFound = 'USER_NOT_FOUND',
  PasswordResetSent = 'PASSWORD_RESET_SENT'
}

export const getMessageFromCode = (resultCode: string) => {
  switch (resultCode) {
    case ResultCode.InvalidCredentials:
      return 'Credențiale invalide!'
    case ResultCode.InvalidSubmission:
      return 'Trimitere invalidă, te rugăm să încerci din nou!'
    case ResultCode.UserAlreadyExists:
      return 'Utilizatorul deja există, te rugăm să te conectezi!'
    case ResultCode.UserCreated:
      return 'Utilizator creat, bun venit!'
    case ResultCode.UnknownError:
      return 'Ceva nu a mers bine, te rugăm să încerci din nou!'
    case ResultCode.UserLoggedIn:
      return 'Autentificat cu succes!'
    case ResultCode.UserNotFound:
      return 'Utilizatorul nu a fost găsit!'
    case ResultCode.PasswordResetSent:
      return 'Linkul pentru resetarea parolei a fost trimis!'
  }
}

export function format(date: Date, formatString: string) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]

  return formatString
    .replace('yyyy', year.toString())
    .replace('yy', String(year).slice(-2))
    .replace('LLL', monthNames[month])
    .replace('MM', String(month + 1).padStart(2, '0'))
    .replace('dd', String(day).padStart(2, '0'))
    .replace('d', day.toString())
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export function parseISO(dateString: string) {
  return new Date(dateString)
}

export function subMonths(date: Date, amount: number) {
  const newDate: Date = new Date(date)
  newDate.setMonth(newDate.getMonth() - amount)
  return newDate
}


export function getAbsoluteUrl(req?: NextApiRequest): string {
  let host

  if (req) {
    host = req.headers['x-forwarded-host'] || req.headers.host
  } else if (typeof window !== 'undefined') {
    host = window.location.host
  }

  if (!host) {
    host = 'localhost:3000' 
  }

  const protocol = host.includes('localhost') ? 'http' : 'https'

  return `${protocol}://${host}`
}
