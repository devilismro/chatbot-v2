import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { auth } from '@/auth'
import { Session } from '@/lib/types'
import { getMissingKeys } from '@/app/actions'
import CookieConsent from '@/components/cookieConsent'

export const metadata = {
  title: 'Codul Muncii chatbot'
}

export default async function IndexPage() {
  const id = nanoid()
  const session = (await auth()) as Session
  const missingKeys = await getMissingKeys()

  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <CookieConsent />
      <Chat id={id} session={session} missingKeys={missingKeys} />
    </AI>
  )
}
