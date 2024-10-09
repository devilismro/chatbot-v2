import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  createStreamableValue,
  streamUI
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import { ChatOpenAI } from '@langchain/openai'
import { BufferMemory } from 'langchain/memory'
import { ChatPromptTemplate } from '@langchain/core/prompts'
//import { formatDocumentsAsString } from 'langchain/util/document'
import { Document } from '@langchain/core/documents'

import { spinner, BotMessage, SystemMessage } from '@/components/stocks'

import { serializeChatHistory } from './serializeChatHistory'
import { retriever } from './retreiver'
import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { auth } from '@/auth'

import ToolMessageComponent from '@/components/toolmessage'
import { SpinnerMessage } from '@/components/stocks/message'

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

const romanianStandalonePrompt = ChatPromptTemplate.fromTemplate(`
  Rolul tău:
  Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Vei răspunde oferind informații clare, precise și detaliate.
  
  Răspunde în limba română folosind informații relevante din Codul Muncii din România și din experiența ta profesională în domeniul legislației muncii.
  
  Dacă întrebarea utilizatorului nu este clară sau necesită mai multe detalii, formulează o întrebare politicoasă pentru a clarifica și a înțelege mai bine contextul.
  
  Explică exact la ce aspecte ale legislației muncii se referă răspunsul tău, menționând jurisprudența, părțile implicate, termenii-cheie și orice alte detalii relevante.
  
  La finalul fiecărui răspuns, include o citare completă a articolului sau articolelor relevante din Codul Muncii pentru a sprijini informațiile oferite.
  
  Indică un procent de încredere pentru fiecare răspuns.
  
  Oferă sugestii de întrebări pentru clarificări ulterioare sau explorarea altor aspecte relevante.
  
  ------------
  ISTORIC CONVERSAȚIE: {chatHistory}
  ------------
  ÎNTREBAREA URMĂTOARE: {question}
  `)

const romanianAnswerPrompt = ChatPromptTemplate.fromTemplate(`
    Rolul tău:
    Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Vei răspunde oferind informații clare, precise și detaliate.
    
    Răspunde în limba română folosind informații relevante din Codul Muncii din România, din jurisprudență și din experiența ta profesională în domeniul legislației muncii.
    
    Dacă întrebarea utilizatorului nu este clară sau necesită mai multe detalii, formulează o întrebare politicoasă pentru a clarifica și a înțelege mai bine contextul.
    
    Explică exact la ce aspecte ale legislației muncii se referă răspunsul tău, menționând jurisprudența, părțile implicate, termenii-cheie și orice alte detalii relevante.
    
    Include rezumate ale cazurilor relevante din contextul furnizat, dacă este cazul.
    
    Dacă utilizatorul solicită mai multe detalii despre un caz specific, oferă o descriere detaliată a acestuia, folosind informațiile din contextul furnizat.
    
    **Contextul furnizat conține surse marcate ca "codul_muncii" sau "case". Utilizează această informație pentru a cita corect sursele în răspunsul tău.**
    
    La finalul fiecărui răspuns, include o citare completă a articolului sau articolelor relevante din Codul Muncii și a oricăror cazuri juridice relevante pentru a sprijini informațiile oferite.
    
    Indică un procent de încredere pentru fiecare răspuns.
    
    Oferă sugestii de întrebări pentru clarificări ulterioare sau explorarea altor aspecte relevante.
    
    ------------
    CONTEXT: {retrievedContext}
    ------------
    ISTORIC CONVERSAȚIE: {chatHistory}
    ------------
    ÎNTREBARE: {question}
    `)

function formatDocumentsWithMetadata(documents: Document[]): string {
  return documents
    .map(doc => {
      const source = doc.metadata.source || 'unknown'
      const content = doc.pageContent
      return `Sursa: ${source}\n${content}`
    })
    .join('\n\n')
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const question = content.trim()
  let answerPrompt = romanianAnswerPrompt
  let standaloneQuestionPrompt = romanianStandalonePrompt

  const spinnerId = nanoid()
  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content: question
      },
      {
        id: spinnerId,
        role: 'assistant',
        content: 'spinner'
      }
    ]
  })

  await new Promise(resolve => setTimeout(resolve, 100))

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
      2,
      1000
    )
    console.timeEnd('Standalone Question Generation Time')
    console.log('Standalone question generated:', standaloneQuestion.text)
  } catch (error) {
    console.error('Error during OpenAI question generation:', error)
    aiState.update({
      ...aiState.get(),
      messages: aiState.get().messages.filter(msg => msg.id !== spinnerId)
    })
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

  const serializedContext = formatDocumentsWithMetadata(retrievedContext);
  console.log('Serialized retrieved context:', serializedContext)

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
    console.log('Answer generated:', answer.text)
  } catch (error) {
    console.error('Error during OpenAI answer generation:', error)
    aiState.update({
      ...aiState.get(),
      messages: aiState.get().messages.filter(msg => msg.id !== spinnerId)
    })
    return {
      id: nanoid(),
      display: (
        <BotMessage content="Îmi pare rău, dar nu am putut genera un răspuns în acest moment!" />
      )
    }
  }

  aiState.update({
    ...aiState.get(),
    messages: aiState.get().messages.map(msg =>
      msg.id === spinnerId
        ? {
            ...msg,
            content: answer.text
          }
        : msg
    )
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-4o-mini-2024-07-18'),
    initial: <SpinnerMessage />,
    system: `
    Esti un asistent AI care va reproduce textele pe care le primeste exact la fel. Nimic mai mult.
    Text primit: ${answer.text}
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
          messages: aiState.get().messages
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
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

      if (message.role === 'tool') {
        display = <ToolMessageComponent content={message.content} />
      } else if (message.role === 'user' || message.role === 'assistant') {
        display = <BotMessage content={message.content} />
      } else {
        display = null
      }

      return { id, display }
    })
}
