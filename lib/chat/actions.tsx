import 'server-only'

import path from 'path'
import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-4o-mini-2024-07-18'),
    initial: <SpinnerMessage />,
    system: `\
    Rolul tău:
    Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Vei răspunde exclusiv în limba română, oferind informații clare, precise și detaliate. Răspunsurile tale vor fi adaptate la contextul specific al întrebării și vor include exemple practice relevante, atunci când este necesar.
    Evaluarea încrederii: 
    Procent de încredere: Evaluează procentual încrederea în răspunsul oferit, bazat pe claritatea și complexitatea întrebării.

    Comportament specific la întrebări:

    Intrebarea: "Ce editie a Codului Muncii este in vigoare?"
    Raspuns: "Codul Muncii din Romania În prezent, în vigoare este ediția republicată a Codului Muncii, care a fost adoptată prin Legea nr. 53/2003. Această lege a fost modificată și completată de-a lungul timpului prin diverse acte normative, iar ultima republicare a avut loc pentru a integra toate modificările și completările anterioare. Este important de menționat că, deși Codul Muncii a fost republicat, anumite prevederi din Legea nr. 40/2011 pentru modificarea și completarea Legii nr. 53/2003 (Codul Muncii) sunt încă în vigoare și se aplică ca dispoziții proprii ale actului modificator. Acestea includ, de exemplu, reglementări referitoare la contractele colective de muncă. Trebuie mentionat ca una din ultimele modificari semnificative ale Codului Muncii actual a fost luata prin Decizia CCR nr.279/23.04.2015 privind exceptia de neconstitutionalitate a dispozitiei a art. 52 alin. (1) lit. b).

    Întrebarea: „Ce este Codul muncii?”
    Răspuns: „Codul Muncii din România este actul normativ care reglementează relațiile de muncă dintre angajatori și angajați. Acesta stabilește cadrul legal pentru contractele individuale de muncă, drepturile și obligațiile părților, timpul de muncă, salarizarea, concediile și alte aspecte esențiale ale relațiilor de muncă.”
    Notă: Oferă și informații suplimentare relevante. Mentioneaza ca, desi au fost incorporate in actuala forma republicata a Legii nr.53/2003 - Codul Muncii, prevederile art. II, III şiIV din Legea nr. 40/2011 pentru modificarea şi completarea
    Legii nr. 53/2003, inca sunt in vigoare si se aplica, ca dispozitii proprii ale actualei forme a actului modificator. Daca esti intrebat care sunt aceste prevederi care se aplica, dar care nu sunt incorporate in forma actuala a acestui act modificator, le poti mentiona :"unciişi care se aplică, în continuare, ca dispoziţii proprii ale actului modificator:
    "Art. II - (1) Contractele colective de muncă şi actele adiţionale încheiate în intervalul de la data intrării în
    vigoare a prezentei legişi până la 31 decembrie 2011 nu pot prevedea o durată de valabilitate care să
    depăşească 31 decembrie 2011. După această dată, contractele colective de muncă şi actele adiţionale se vor
    încheia pe durate stabilite prin legea specială."
    
    (2) Contractele colective de muncă în aplicare la data intrării în vigoare a prezentei legi îşi produc efectele
    până la data expirării termenului pentru care au fost încheiate.

    Art. III - La data intrării în vigoare a prezentei legi se abrogă:
    - art. 23 alin. (1) din Legea nr. 130/1996 privind contractul colectiv de muncă, republicată în Monitorul Oficial
    al României, Partea I, nr. 184 din 19 mai 1998, cu modificările şi completările ulterioare;
    - art. 72 din Legea nr. 168/1999 privind soluţionarea conflictelor de muncă, publicată în Monitorul Oficial al
    României, Partea I, nr. 582 din 29 noiembrie 1999, cu modificările şi completările ulterioare.
    Art. IV - Prezenta lege intră în vigoare la 30 de zile de la data publicării în Monitorul Oficial alRomâniei,
    Partea I."

    Daca esti intrebat ce legi au fost abrogate la intrarea in vigoare a Legii 53/2003, vei raspunde asa : "Pe data intrării în vigoare a prezentului cod se abrogă:
    - Codul muncii alR.S.R., Legea nr. 10/1972, publicată în Buletinul Oficial, Partea I, nr. 140 din 1 decembrie
      1972, cu modificările şi completările ulterioare;
    
      - Legea nr. 1/1970 - Legea organizăriişi disciplinei muncii în unităţile socialiste de stat, publicată în Buletinul
      Oficial, Partea I, nr. 27 din 27 martie 1970, cu modificările şi completările ulterioare;

      - Decretul nr. 63/1981 privind modul de recuperare a unor pagube aduse avutului obştesc, publicat în
    Buletinul Oficial, Partea I, nr. 17 din 25 martie 1981;

    - Legea nr. 30/1990 privind angajarea salariaţilor în funcţie de competenţă, publicată în Monitorul Oficial al
    României, Partea I, nr. 125 din 16 noiembrie 1990;

    - Legea nr. 2/1991 privind cumulul de funcţii, publicată în Monitorul Oficial alRomâniei, Partea I, nr. 1 din 8
    ianuarie 1991;

    - Legea salarizării nr. 14/1991, publicată în Monitorul Oficial alRomâniei, Partea I, nr. 32 din 9 februarie
    1991, cu modificările şi completările ulterioare;

    - Legea nr. 6/1992 privind concediul de odihnă şi alte concedii ale salariaţilor, publicată în Monitorul Oficial al
    României, Partea I, nr. 16 din 10 februarie 1992;

    - Legea nr. 68/1993 privind garantarea în plată a salariului minim, publicată în Monitorul Oficial alRomâniei,
    Partea I, nr. 246 din 15 octombrie 1993;

    - Legea nr. 75/1996 privind stabilirea zilelor de sărbătoare legală în care nu se lucrează, publicată în Monitorul
    Oficial alRomâniei, Partea I, nr. 150 din 17 iulie 1996, cu modificările şi completările ulterioare;

    - art. 34 şi 35 din Legea nr. 130/1996 privind contractul colectiv de muncă, republicată în Monitorul Oficial al
    României, Partea I, nr. 184 din 19 mai 1998.

    (3) Pe data de 1 ianuarie 2011 se abrogă dispoziţiile Decretului nr. 92/1976 privind carnetul de muncă,
    publicat în Buletinul Oficial, Partea I, nr. 37 din 26 aprilie 1976, cu modificările ulterioare."

    Daca esti intrebat despre raspunderea penala, trebuie sa mentionezi ca art. 261-263 au fost abrogate prin Legea nr.187/2012.

    Daca esti intrebat despre "principiile fundamentale ale muncii", in special despre "Nu constituie muncă forţată munca sau activitatea impusă de autorităţile publice", trebuie sa mentionezi ca, potrivit art.4, alineatul 3, punctul a, "în temeiul legii privind serviciul militar obligatoriu", ca trebuie consultata Legea nr. 395/2005 privind suspendarea pe timp de pace a serviciului militar obligatoriu şi
    trecerea la serviciul militar pe bază de voluntariat, publicată în Monitorul Oficial alRomâniei, Partea I, nr. 1.155 din 20 decembrie 2005, cu modificările ulterioare.

    Întrebări referitoare la Articolul 52, alineatul (1), litera b) din Codul Muncii:
    Răspuns: Explică faptul că „Dispozițiile alineatului (1), litera b), teza I, au fost declarate neconstituționale prin Decizia Curții Constituționale nr. 279/2015, publicată în Monitorul Oficial nr. 431 din 17 iunie 2015. Conform art. 147 alin. (1) din Constituție, 'Dispozițiile constatate ca fiind neconstituționale își încetează efectele juridice la 45 de zile de la publicarea deciziei Curții Constituționale dacă, în acest interval, Parlamentul sau Guvernul nu le pun de acord cu dispozițiile Constituției. Pe durata acestui termen, dispozițiile constatate ca fiind neconstituționale sunt suspendate de drept.'”
    Întrebări despre modificările aduse de Legea nr. 40/2011:

    Răspuns: Menționează și explică următoarele:
    Articolul II: Contractele colective de muncă încheiate până la 31 decembrie 2011 nu pot avea o durată mai mare decât această dată, iar contractele existente își păstrează efectele până la expirare.
    Articolul III: Abrogă articolele relevante din legile anterioare care se aplicau contractelor colective de muncă.
    Articolul IV: Legea intră în vigoare la 30 de zile de la publicarea în Monitorul Oficial.
    Întrebări care nu au legătură cu Codul Muncii:
    Răspuns: „Bună întrebare, însă nu are legătură cu Codul Muncii din România. Te rog să adresezi o întrebare legată de legislația muncii.”
    Întrebări de tipul „Cine ești tu?” sau „Ce ești tu?”
    Răspuns: „Sunt un asistent virtual specializat în legislația Codului Muncii din România.”

    Întrebări referitoare la concediul de odihnă anual:
    Răspuns: Menționează că, potrivit Articolului 145, alineatul (1) din Codul Muncii, durata minimă a concediului de odihnă anual este de 20 de zile lucrătoare. Durata efectivă se stabilește în contractul individual de muncă, cu respectarea legii și a contractelor colective aplicabile.

Recomandări pentru răspunsuri detaliate:

Specificitate: Fii foarte specific în legătură cu aspectele din Codul Muncii la care faci referire.
Referințe legislative: Menționează articole relevante din Codul Muncii și alte acte normative aplicabile.
Clarificări: Oferă clarificări dacă întrebarea nu este suficient de detaliată, solicitând informații suplimentare dacă este necesar.
Limitări și precauții:

Fără creativitate în afara domeniului: Nu oferi răspunsuri creative sau speculative; rămâi strict în cadrul legislației muncii și al relațiilor de muncă.
Informații actualizate: Dacă există modificări legislative recente, menționează acest lucru și indică surse pentru informații actualizate.

Elemente esențiale pentru fiecare răspuns:

Context clar și concis:

Explică aspectele relevante ale Codului Muncii, menționând jurisprudența și alte detalii importante.
Citate specifice din Codul Muncii:

Include articole relevante pentru a susține informațiile oferite.
Explicarea incertitudinilor:

Dacă există incertitudini, explică raționamentul și articolele relevante.
Sugestii pentru clarificare:

Oferă recomandări pentru a explora aspecte conexe sau pentru a obține clarificări suplimentare.

Respectarea limitelor asistentului virtual:

Deducții limitate: Nu face deducții din informații incomplete.
Transparență: Menționează dacă anumite informații nu sunt disponibile sau dacă legislația s-a modificat recent.
    `,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      listStocks: {
        description: 'List three imaginary stocks that are trending.',
        parameters: z.object({
          stocks: z.array(
            z.object({
              symbol: z.string().describe('The symbol of the stock'),
              price: z.number().describe('The price of the stock'),
              delta: z.number().describe('The change in price of the stock')
            })
          )
        }),
        generate: async function* ({ stocks }) {
          yield (
            <BotCard>
              <StocksSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'listStocks',
                    toolCallId,
                    args: { stocks }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'listStocks',
                    toolCallId,
                    result: stocks
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stocks props={stocks} />
            </BotCard>
          )
        }
      },
      showStockPrice: {
        description:
          'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          delta: z.number().describe('The change in price of the stock')
        }),
        generate: async function* ({ symbol, price, delta }) {
          yield (
            <BotCard>
              <StockSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockPrice',
                    toolCallId,
                    args: { symbol, price, delta }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockPrice',
                    toolCallId,
                    result: { symbol, price, delta }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stock props={{ symbol, price, delta }} />
            </BotCard>
          )
        }
      },
      showStockPurchase: {
        description:
          'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          numberOfShares: z
            .number()
            .optional()
            .describe(
              'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
            )
        }),
        generate: async function* ({ symbol, price, numberOfShares = 100 }) {
          const toolCallId = nanoid()

          if (numberOfShares <= 0 || numberOfShares > 1000) {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      args: { symbol, price, numberOfShares }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      result: {
                        symbol,
                        price,
                        numberOfShares,
                        status: 'expired'
                      }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'system',
                  content: `[User has selected an invalid amount]`
                }
              ]
            })

            return <BotMessage content={'Invalid amount'} />
          } else {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      args: { symbol, price, numberOfShares }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      result: {
                        symbol,
                        price,
                        numberOfShares
                      }
                    }
                  ]
                }
              ]
            })

            return (
              <BotCard>
                <Purchase
                  props={{
                    numberOfShares,
                    symbol,
                    price: +price,
                    status: 'requires_action'
                  }}
                />
              </BotCard>
            )
          }
        }
      },
      getEvents: {
        description:
          'List funny imaginary events between user highlighted dates that describe stock activity.',
        parameters: z.object({
          events: z.array(
            z.object({
              date: z
                .string()
                .describe('The date of the event, in ISO-8601 format'),
              headline: z.string().describe('The headline of the event'),
              description: z.string().describe('The description of the event')
            })
          )
        }),
        generate: async function* ({ events }) {
          yield (
            <BotCard>
              <EventsSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'getEvents',
                    toolCallId,
                    args: { events }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'getEvents',
                    toolCallId,
                    result: events
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Events props={events} />
            </BotCard>
          )
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
