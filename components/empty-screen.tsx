import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-lg font-semibold">
          Bine ați venit la Chat versiunea 1.0.1 despre Codul Muncii!
        </h1>
        <p className="leading-normal text-muted-foreground">
          Aceasta este o aplicație de chatbot AI, concepută pentru a
          vă oferi răspunsuri și clarificări legate de Codul Muncii din România.
        </p>
        
        <p className="leading-normal text-muted-foreground">
          Versiunea 1.0.1 aduce îmbunătățiri la nivelul vitezei de răspuns și
          acurateței informațiilor. Scopul acestui chatbot este să
          ofere o interacțiune ușoară și intuitivă pentru a vă sprijini în
          înțelegerea drepturilor și obligațiilor din Codul Muncii.
        </p>
      </div>
    </div>
  )
}
