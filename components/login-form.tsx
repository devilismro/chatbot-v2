'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { authenticate } from '@/app/login/actions'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconSpinner } from './ui/icons'
import { getMessageFromCode } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [result, dispatch] = useFormState(authenticate, undefined)
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  useEffect(() => {
    if (result) {
      if (result.type === 'error') {
        toast.error(getMessageFromCode(result.resultCode))
      } else {
        toast.success(getMessageFromCode(result.resultCode))
        router.refresh()
      }
    }
  }, [result, router])
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
      } else {
        const errorData = await res.json()
        toast.error(errorData.message || 'Something went wrong')
      }
    } catch (error) {
      console.error('Error requesting password reset:', error)
      toast.error('Error requesting password reset')
    }
  }

  return (
    <>
      <form
        action={dispatch}
        className="flex flex-col items-center gap-4 space-y-3"
      >
        <div className="w-full flex-1 rounded-lg border bg-white px-6 pb-4 pt-8 shadow-md  md:w-96 dark:bg-zinc-950">
          <h1 className="mb-3 text-2xl font-bold">
            Pentru a continua, va rugam sa va logati
          </h1>
          <div className="w-full">
            <div>
              <label
                className="mb-3 mt-5 block text-xs font-medium text-zinc-400"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative">
                <input
                  className="peer block w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Adresa de email"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label
                className="mb-3 mt-5 block text-xs font-medium text-zinc-400"
                htmlFor="password"
              >
                Parola
              </label>
              <div className="relative">
                <input
                  className="peer block w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Parola"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>
          <LoginButton />
        </div>

        <Link
          href="/signup"
          className="flex flex-row gap-1 text-sm text-zinc-400"
        >
          Nu ai inca un cont/{' '}
          <div className="font-semibold underline">Inscrie-te aici!</div>
        </Link>

        <button
          type="button"
          className="text-sm text-zinc-400 underline"
          onClick={() => setShowResetForm(!showResetForm)}
        >
          {showResetForm ? 'Inapoi la Login' : 'Ai uitat parola? Reseteaza-o!'}
        </button>
      </form>

      {showResetForm && (
        <form
          onSubmit={handlePasswordReset}
          className="mt-4 w-full md:w-96 mx-auto"
        >
          <h2 className="mb-3 text-xl font-semibold">Resetează parola</h2>
          <input
            type="email"
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
            className="peer block w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="Adresa de email"
            required
          />
          <button
            type="submit"
            className="my-4 w-full rounded-md bg-zinc-900 p-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Trimite link-ul de resetare
          </button>
        </form>
      )}
    </>
  )
}

function LoginButton() {
  const { pending } = useFormStatus()

  return (
    <button
      className="my-4 flex h-10 w-full flex-row items-center justify-center rounded-md bg-zinc-900 p-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      aria-disabled={pending}
    >
      {pending ? <IconSpinner /> : 'Log in'}
    </button>
  )
}
