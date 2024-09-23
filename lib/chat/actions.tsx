import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState
} from 'ai/rsc'

import { ChatOpenAI } from '@langchain/openai'
import { BufferMemory } from 'langchain/memory'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { formatDocumentsAsString } from 'langchain/util/document'
import { Document } from '@langchain/core/documents'
import { streamText } from 'ai'
import { createStreamableValue } from 'ai/rsc'

import { BotMessage, SystemMessage } from '@/components/stocks'
import { SpinnerMessage } from '@/components/stocks/message'

import { serializeChatHistory } from './serializeChatHistory'
import { retriever } from './retreiver'
import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { auth } from '@/auth'
import { OpenAI } from 'openai'

type MutableAIState = {
  get: () => AIState
  update: (newState: AIState) => void
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

import ToolMessageComponent from '@/components/toolmessage'

type Chat = {
  id: string
  title: string
  userId: string
  createdAt: Date
  messages: ChatMessage[]
  path: string
}

type ToolContent = any

type ChatMessage = UserMessage | AssistantMessage | ToolMessage | SystemMessage

interface BaseMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
}

interface UserMessage extends BaseMessage {
  role: 'user'
  content: string
}

interface AssistantMessage extends BaseMessage {
  role: 'assistant'
  content: string
}

interface ToolMessage extends BaseMessage {
  role: 'tool'
  content: ToolContent
}

interface SystemMessage extends BaseMessage {
  role: 'system'
  content: string
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1} of ${retries}`)
      return await fn()
    } catch (error) {
      console.error(`Error on attempt ${i + 1}:`, error)
      if (i === retries - 1) {
        throw error
      }
      const backoffDelay = delay * Math.pow(2, i)
      console.log(`Waiting for ${backoffDelay}ms before retrying...`)
      await new Promise(resolve => setTimeout(resolve, backoffDelay))
    }
  }
  throw new Error('Failed to execute function after maximum retries')
}

const MAX_HISTORY_LENGTH = 10
function truncateHistory(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-MAX_HISTORY_LENGTH)
}

const standaloneQuestionPrompt = ChatPromptTemplate.fromTemplate(`
Rolul tău:
Ești un expert în legislația și dreptul muncii din România, cu peste 30 de ani de experiență practică. 
    Vei răspunde exclusiv în limba română și îți vei baza răspunsurile doar pe informațiile din documentul atașat în Knowledge, respectiv Codul muncii din România. Fiecare răspuns trebuie să fie clar, precis și detaliat, adaptat la contextul specific al întrebării și să includă exemple practice relevante atunci când este necesar. 
    Dacă întrebarea nu se referă la Codul muncii, răspunde astfel: „Bună întrebare, dar nu are legătură cu Codul muncii românesc, așa că nu te pot ajuta.” 
    Pentru întrebările neclare, solicită informații suplimentare pentru a clarifica contextul.
    Asigură-te că fiecare răspuns furnizat include următoarele elemente esențiale: 
    
    Context clar și concis: Explică exact la ce aspecte ale Codului muncii se referă răspunsul tău, menționând jurisprudența, părțile implicate, termenii-cheie și orice alte detalii relevante.
    Citate specifice din Codul muncii: La finalul fiecărui răspuns, include o citare completă a articolului sau articolelor relevante din Codul muncii pentru a sprijini informațiile oferite.
    Explicarea incertitudinilor: În cazurile în care răspunsul implică un grad de incertitudine, oferă detalii despre articolele care pot fi relevante și explică raționamentul din spatele interpretării tale.
    Procent de încredere în răspuns: Indică un procent de încredere pentru fiecare răspuns, bazat pe complexitatea și claritatea întrebării inițiale.
    Sugestii de prompturi suplimentare: La finalul fiecărui răspuns, oferă sugestii de prompturi care ar putea ajuta la clarificarea ulterioară a subiectului discutat sau la explorarea altor aspecte relevante.
    
    Respectarea limitelor AI: Evită să presupui că AI-ul va înțelege sau va face deducții din informațiile incomplete. Dacă există modificări legislative recente care pot influența răspunsul, menționează acest lucru și indică unde pot fi găsite aceste modificări.

------------ 
ISTORIC CONVERSAȚIE: {chatHistory}
------------ 
ÎNTREBARE URMĂTOARE: {question}
`)

const answerPrompt = ChatPromptTemplate.fromTemplate(`
Rolul tău:
Ești un expert în legislația și dreptul muncii din România, cu peste 30 de ani de experiență practică. 
    Vei răspunde exclusiv în limba română și îți vei baza răspunsurile doar pe informațiile din documentul atașat în Knowledge, respectiv Codul muncii din România. Fiecare răspuns trebuie să fie clar, precis și detaliat, adaptat la contextul specific al întrebării și să includă exemple practice relevante atunci când este necesar. 
    Dacă întrebarea nu se referă la Codul muncii, răspunde astfel: „Bună întrebare, dar nu are legătură cu Codul muncii românesc, așa că nu te pot ajuta.” 
    Pentru întrebările neclare, solicită informații suplimentare pentru a clarifica contextul.
    Asigură-te că fiecare răspuns furnizat include următoarele elemente esențiale: 
    
    Context clar și concis: Explică exact la ce aspecte ale Codului muncii se referă răspunsul tău, menționând jurisprudența, părțile implicate, termenii-cheie și orice alte detalii relevante.
    Citate specifice din Codul muncii: La finalul fiecărui răspuns, include o citare completă a articolului sau articolelor relevante din Codul muncii pentru a sprijini informațiile oferite.
    Explicarea incertitudinilor: În cazurile în care răspunsul implică un grad de incertitudine, oferă detalii despre articolele care pot fi relevante și explică raționamentul din spatele interpretării tale.
    Procent de încredere în răspuns: Indică un procent de încredere pentru fiecare răspuns, bazat pe complexitatea și claritatea întrebării inițiale.
    Sugestii de prompturi suplimentare: La finalul fiecărui răspuns, oferă sugestii de prompturi care ar putea ajuta la clarificarea ulterioară a subiectului discutat sau la explorarea altor aspecte relevante.
    
    Respectarea limitelor AI: Evită să presupui că AI-ul va înțelege sau va face deducții din informațiile incomplete. Dacă există modificări legislative recente care pot influența răspunsul, menționează acest lucru și indică unde pot fi găsite aceste modificări.
------------ 
CONTEXT: {retrievedContext}
------------ 
ISTORIC CONVERSAȚIE: {chatHistory}
------------ 
ÎNTREBARE: {question}
`)

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
      },
      {
        id: nanoid(),
        role: 'system',
        content: 'loading-spinner'
      }
    ]
  })

  const stream = createStreamableValue('')

  const truncatedChatHistory = truncateHistory(aiState.get().messages)
  const chatHistory = serializeChatHistory(truncatedChatHistory)
  console.log('Received user message:', content)
  console.log('Current chat history:', chatHistory)

  const chatModel = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini-2024-07-18',
    temperature: 0,
    timeout: 20000
  })

  let standaloneQuestion
  console.time('Standalone Question Generation Time')
  try {
    const questionChain = standaloneQuestionPrompt.pipe(chatModel)
    standaloneQuestion = await withRetry(
      () =>
        questionChain.invoke({
          chatHistory,
          question: content
        }),
      5,
      1000
    )
    console.timeEnd('Standalone Question Generation Time')
    console.log('Standalone question generated:', standaloneQuestion.text)
  } catch (error) {
    console.error('Error during OpenAI question generation:', error)
    return {
      id: nanoid(),
      display: (
        <BotMessage content="Îmi pare rău, dar nu am putut genera un răspuns în acest moment!" />
      )
    }
  }

  let retrievedContext: Document[] = []
  console.time('Document Retrieval Time')
  try {
    retrievedContext = await withRetry(
      () => retriever.getRelevantDocuments(content),
      2,
      1000
    )
    console.timeEnd('Document Retrieval Time')
  } catch (error) {
    console.error('Error retrieving documents from Supabase:', error)
  }

  const serializedContext = formatDocumentsAsString(retrievedContext)
  console.log('Serialized retrieved context:', serializedContext.length)

  streamCompletion(
    aiState,
    chatHistory,
    serializedContext,
    standaloneQuestion.text
  )

  let answer
  console.time('Answer Generation Time')
  try {
    const answerChain = answerPrompt.pipe(chatModel)
    answer = await withRetry(
      () =>
        answerChain.invoke({
          chatHistory,
          retrievedContext: serializedContext,
          question: standaloneQuestion.text
        }),
      2,
      1000
    )
    console.timeEnd('Answer Generation Time')
  } catch (error) {
    console.error('Error during OpenAI answer generation:', error)
    return {
      id: nanoid(),
      display: (
        <BotMessage content="Îmi pare rău, dar nu am putut genera un răspuns în acest moment!" />
      )
    }
  }

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages.filter(m => m.content !== 'loading-spinner'),
      {
        id: nanoid(),
        role: 'assistant',
        content: answer.text
      }
    ]
  })

  return { id: nanoid(), display: <BotMessage content={answer.text} /> }
}

export type AIState = {
  chatId: string
  messages: ChatMessage[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'
    const session = await auth()
    if (session && session.user) {
      const aiState = getAIState() as AIState
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

export const getUIStateFromAIState = (aiState: AIState) => {
  return aiState.messages
    .filter((message: ChatMessage) => message.role !== 'system')
    .map((message: ChatMessage, index: number) => {
      const id = `${aiState.chatId}-${index}`
      let display: React.ReactNode = null

      if (message.content === 'loading-spinner') {
        display = <SpinnerMessage />
      } else if (message.role === 'tool') {
        display = <ToolMessageComponent content={message.content} />
      } else if (message.role === 'user' || message.role === 'assistant') {
        display = <BotMessage content={message.content} />
      }
      return { id, display }
    })
}

async function streamCompletion(
  aiState: MutableAIState,
  chatHistory: string,
  serializedContext: string,
  questionText: string
) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: serializedContext },
      { role: 'user', content: questionText }
    ],
    stream: true
  })

  let finalMessage = ''

  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content || ''
    finalMessage += content

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages.filter(m => m.content !== 'loading-spinner'),
        {
          id: nanoid(),
          role: 'assistant',
          content: finalMessage
        }
      ]
    })
  }

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages.filter(m => m.content !== 'loading-spinner'),
      {
        id: nanoid(),
        role: 'assistant',
        content: finalMessage
      }
    ]
  })
}
