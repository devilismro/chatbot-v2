'use client'

import { CookieIcon } from '@radix-ui/react-icons'
import { Button } from './ui/button'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export default function CookieConsent({
  variant = 'default',
  demo = false,
  onAcceptCallback = () => {},
  onDeclineCallback = () => {}
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hide, setHide] = useState(false)

  const accept = () => {
    setIsOpen(false)
    document.cookie =
      'cookieConsent=true; expires=Fri, 31 Dec 2024 23:59:59 GMT'
    setTimeout(() => {
      setHide(true)
    }, 800)
    onAcceptCallback()
  }

  const decline = () => {
    setIsOpen(false)
    setTimeout(() => {
      setHide(true)
    }, 700)
    onDeclineCallback()
  }

  useEffect(() => {
    try {
      setIsOpen(true)
      if (document.cookie.includes('cookieConsent=true')) {
        if (!demo) {
          setIsOpen(false)
          setTimeout(() => {
            setHide(true)
          }, 700)
        }
      }
    } catch (e) {
      console.error('Error: ', e)
    }
  }, [demo])

  return variant !== 'small' ? (
    <div
      className={cn(
        'fixed z-[200] bottom-0 left-0 right-0 sm:left-4 sm:bottom-4 w-full sm:max-w-md duration-700',
        !isOpen
          ? 'transition-[opacity,transform] translate-y-8 opacity-0'
          : 'transition-[opacity,transform] translate-y-0 opacity-100',
        hide && 'hidden'
      )}
    >
      <div className="dark:bg-card bg-background rounded-md m-3 border border-border shadow-lg">
        <div className="grid gap-2">
          <div className="border-b border-border h-14 flex items-center justify-between p-4">
            <h1 className="text-lg font-medium">Folosim cookie-uri!</h1>
            <CookieIcon className="h-[1.2rem] w-[1.2rem]" />
          </div>
          <div className="p-4">
            <p className="text-sm font-normal text-start">
              Folosim cookie-uri pentru a ne asigura că aveți cea mai bună
              experiență pe site-ul nostru. Pentru mai multe informații despre
              modul în care utilizăm cookie-urile, vă rugăm să consultați
              politica noastră de cookie-uri.
              <br />
              <br />
              În conformitate cu regulamentul GDPR, aveți dreptul să decideți ce
              tipuri de cookie-uri acceptați pe site-ul nostru și să vă
              schimbați preferințele oricând. Ne asigurăm că datele
              dumneavoastră sunt protejate și respectăm confidențialitatea
              acestora.
              <br />
              <br />
              <span className="text-xs">
                Făcând click pe "
                <span className="font-medium opacity-80">Accept</span>", sunteți
                de acord cu utilizarea cookie-urilor de către noi.
              </span>
              <br />
              {/* <a href="#" className="text-xs underline">
                Aflați mai multe.
              </a> */}
            </p>
          </div>
          <div className="flex gap-2 p-4 py-5 border-t border-border dark:bg-background/20">
            <Button onClick={accept} className="w-full">
              Accept
            </Button>
            <Button onClick={decline} className="w-full" variant="secondary">
              Refuz
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null
}
