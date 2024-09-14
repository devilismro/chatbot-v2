'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tokenParam = urlParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      setIsTokenValid(true) 
    }
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isTokenValid) {
      toast.error('Token invalid sau expirate')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Parolele nu se potrivesc!')
      return
    }

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, password })
      })

      if (res.ok) {
        toast.success('Parola a fost resetată cu succes!')
        router.push('/login')
      } else {
        const { message } = await res.json()
        toast.error(message || 'Eroare la resetarea parolei!')
      }
    } catch (error) {
      toast.error('Eroare la resetarea parolei!')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-6 bg-white rounded-md shadow-md dark:bg-zinc-900">
        <h2 className="mb-6 text-2xl font-bold text-center">Resetează Parola</h2>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <Label htmlFor="password">Parola Nouă</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Introdu parola nouă"
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmă Parola Nouă</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e: any) => setConfirmPassword(e.target.value)}
              placeholder="Confirmă noua parola"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Resetează Parola
          </Button>
        </form>
      </div>
    </div>
  )
}
