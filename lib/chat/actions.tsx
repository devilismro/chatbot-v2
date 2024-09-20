import 'server-only'
import React from 'react'

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

import { serializeChatHistory } from './serializeChatHistory'
import { retriever } from './retreiver'
import { ChatOpenAI } from '@langchain/openai'
import { BufferMemory } from 'langchain/memory'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { formatDocumentsAsString } from 'langchain/util/document'

import * as z from 'zod'
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

const openAIApiKey = process.env.OPENAI_API_KEY

const memory = new BufferMemory({
  memoryKey: 'chatHistory',
  inputKey: 'question',
  outputKey: 'response',
  returnMessages: true
})

const standaloneQuestionPrompt = ChatPromptTemplate.fromTemplate(`
Rolul tău:
Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Vei răspunde exclusiv în limba română, oferind informații clare, precise și detaliate. Răspunsurile tale vor fi adaptate la contextul specific al întrebării și vor include exemple practice relevante, atunci când este necesar. NU răspunzi la întrebări în afara Codului Muncii din România.

Acesta este istoricul conversației și întrebarea următoare:
------------
ISTORIC CONVERSAȚIE: {chatHistory}
------------
ÎNTREBARE URMĂTOARE: {question}
------------
Te rog să reformulezi întrebarea următoare ca o întrebare completă care poate fi înțeleasă independent:
`)

const answerPrompt = ChatPromptTemplate.fromTemplate(`
Rolul tău:
Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Vei răspunde exclusiv în limba română, oferind informații clare, precise și detaliate, adaptate la contextul specific. Include exemple practice atunci când este relevant. NU răspunzi la întrebări în afara Codului Muncii din România.

Acesta este istoricul conversației și întrebarea, împreună cu contextul relevant:
------------
CONTEXT: {retrievedContext}
------------
ISTORIC CONVERSAȚIE: {chatHistory}
------------
ÎNTREBARE: {question}
------------
Te rog să răspunzi în detaliu, evaluând și încrederea răspunsului pe o scară procentuală în funcție de complexitatea întrebării. Procent de încredere:
`)

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

  const textStream = createStreamableValue('')
  const textNode = <BotMessage content={textStream.value} />

  const assistantMessageUI = createStreamableUI(<SpinnerMessage />)

  let isFirstToken = true

  const chatHistory = serializeChatHistory(aiState.get().messages)

  const chatModel = new ChatOpenAI({
    openAIApiKey,
    model: 'gpt-4o-mini-2024-07-18',
    temperature: 0
  })

  const questionChain = standaloneQuestionPrompt.pipe(chatModel)
  const standaloneQuestion = await questionChain.invoke({
    chatHistory,
    question: content
  })

  const retrievedContext = await retriever.getRelevantDocuments(
    standaloneQuestion.text
  )
  const serializedContext = formatDocumentsAsString(retrievedContext)

  const streamingChatModel = new ChatOpenAI({
    openAIApiKey,
    model: 'gpt-4o-mini-2024-07-18',
    temperature: 0,
    streaming: true,
    callbacks: [
      {
        handleLLMNewToken: (token: string) => {
          if (isFirstToken) {
            assistantMessageUI.update(textNode)
            isFirstToken = false
          }
          textStream.update(token)
        },
        handleLLMEnd: output => {
          textStream.done()
          assistantMessageUI.done()

          aiState.update({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: output.generations[0][0].text
              }
            ]
          })
        },
        handleLLMError: error => {
          console.error('LLM Error:', error)
          textStream.done()
          assistantMessageUI.done()
        }
      }
    ]
  })

  const answerChain = answerPrompt.pipe(streamingChatModel)

  await answerChain.invoke({
    chatHistory,
    retrievedContext: serializedContext,
    question: standaloneQuestion.text
  })

  return {
    id: nanoid(),
    display: assistantMessageUI.value
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
