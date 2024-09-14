import { redirect } from 'next/navigation'
import CookieConsent from '@/components/cookieConsent'

export default async function NewPage() {
  redirect('/')
}
