import type { NextApiRequest, NextApiResponse } from 'next'
import { serializeChatHistory } from '@/lib/chat/serializeChatHistory'
import { retriever } from '@/lib/chat/retreiver'
import { nanoid } from '@/lib/utils'

import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { formatDocumentsAsString } from 'langchain/util/document'
import { Document } from '@langchain/core/documents'

const MAX_HISTORY_LENGTH = 20

function truncateHistory(history: ChatMessage[]): ChatMessage[] {
  console.log(`Truncating chat history to the last ${MAX_HISTORY_LENGTH} messages.`)
  return history.slice(-MAX_HISTORY_LENGTH)
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

const standaloneQuestionPrompt = ChatPromptTemplate.fromTemplate(`
Rolul tău:
Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Vei răspunde exclusiv în limba română, oferind informații clare, precise și detaliate.
------------
ISTORIC CONVERSAȚIE: {chatHistory}
------------
ÎNTREBARE URMĂTOARE: {question}
`)

const answerPrompt = ChatPromptTemplate.fromTemplate(`
Rolul tău:
Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Răspunde adaptat la contextul specific și includ exemple practice.
------------
CONTEXT: {retrievedContext}
------------
ISTORIC CONVERSAȚIE: {chatHistory}
------------
ÎNTREBARE: {question}
`)

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
}

export async function POST(req: Request, res: NextApiResponse) {
  console.log('Received POST request')
  let content, aiState
  try {
    const requestData = await req.json()
    content = requestData.content
    aiState = requestData.aiState
    console.log('Request data parsed successfully:', { content, aiState })
  } catch (error) {
    console.error('Error parsing request JSON:', error)
    return new Response(
      JSON.stringify({ message: 'Bad Request: Invalid JSON' }),
      { status: 400 }
    )
  }

  if (!content || !aiState) {
    console.error('Bad Request: Missing content or AI state')
    return new Response(
      JSON.stringify({ message: 'Bad Request: Missing content or AI state' }),
      { status: 400 }
    )
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('Missing OpenAI API key in environment variables')
      throw new Error('Missing OpenAI API key')
    }
    console.log('OpenAI API key retrieved successfully')

    const answer = await submitUserMessage(content, aiState, apiKey)
    console.log('Answer generated successfully')
    return new Response(JSON.stringify({ answer }), { status: 200 })
  } catch (error: any) {
    console.error('Server Error:', error)
    return new Response(
      JSON.stringify({ message: 'Server Error: ' + error.message }),
      { status: 500 }
    )
  }
}

async function submitUserMessage(
  content: string,
  aiState: any,
  apiKey: string
) {
  console.log('Starting submitUserMessage function')
  const messages: ChatMessage[] = aiState.messages
  console.log('AI state messages:', messages)

  const truncatedChatHistory = truncateHistory(messages)
  console.log('Truncated chat history:', truncatedChatHistory)

  const chatHistory = serializeChatHistory(truncatedChatHistory)
  console.log('Serialized chat history:', chatHistory)

  console.log('Received user message:', content)

  const chatModel = new ChatOpenAI({
    openAIApiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0,
    timeout: 20000
  })
  console.log('ChatOpenAI model initialized')

  let standaloneQuestion
  try {
    console.log('Generating standalone question...')
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
    console.log('Standalone question generated:', standaloneQuestion.text)
  } catch (error) {
    console.error('Error during OpenAI question generation:', error)
    throw new Error(
      'Îmi pare rău, dar nu am putut genera un răspuns în acest moment!'
    )
  }

  let retrievedContext: Document[] = []
  try {
    console.log('Retrieving relevant documents from retriever...')
    retrievedContext = await withRetry(
      () => retriever.getRelevantDocuments(content),
      2,
      1000
    )
    console.log('Retrieved documents:', retrievedContext)
  } catch (error) {
    console.error('Error retrieving documents from retriever:', error)
  }

  const serializedContext = formatDocumentsAsString(retrievedContext)
  console.log('Serialized context length:', serializedContext.length)

  let answer
  console.time('Answer Generation Time')
  try {
    console.log('Generating answer...')
    const answerChain = answerPrompt.pipe(chatModel)
    console.log('Answer chain initialized')
    console.log('Invoking answer chain with data:', {
      chatHistory,
      retrievedContext: serializedContext,
      question: standaloneQuestion.text
    })
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
    throw new Error(
      'Îmi pare rău, dar nu am putut genera un răspuns în acest moment!'
    )
  }

  return answer.text
}
