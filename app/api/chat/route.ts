import { serializeChatHistory } from '@/lib/chat/serializeChatHistory'
import { retriever } from '@/lib/chat/retreiver'
import { nanoid } from '@/lib/utils'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { formatDocumentsAsString } from 'langchain/util/document'
import { Document } from '@langchain/core/documents'
  

const MAX_HISTORY_LENGTH = 20

function truncateHistory(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-MAX_HISTORY_LENGTH)
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) {
        throw error
      }
      const backoffDelay = delay * Math.pow(2, i)
      await new Promise((resolve) => setTimeout(resolve, backoffDelay))
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

export async function POST(req: Request) {
  try {
    const { content, aiState } = await req.json()

    if (!content || !aiState) {
      return new Response(
        JSON.stringify({ message: 'Bad Request: Missing content or AI state' }),
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing OpenAI API key')
    }

    const answer = await submitUserMessage(content, aiState, apiKey)
    return new Response(JSON.stringify({ answer }), { status: 200 })
  } catch (error: any) {
    console.error('Server Error:', error)
    return new Response(
      JSON.stringify({ message: 'Server Error: ' + error.message }),
      { status: 500 }
    )
  }
}

async function submitUserMessage(content: string, aiState: any, apiKey: string) {
  const messages: ChatMessage[] = aiState.messages
  const truncatedChatHistory = truncateHistory(messages)
  const chatHistory = serializeChatHistory(truncatedChatHistory)

  console.log('Received user message:', content)
  console.log('Current chat history:', chatHistory)

  const chatModel = new ChatOpenAI({
    openAIApiKey: apiKey,
    model: 'gpt-4o-mini-2024-07-18',
    temperature: 0,
    timeout: 10000,
  })

  let standaloneQuestion
  try {
    const questionChain = standaloneQuestionPrompt.pipe(chatModel)
    standaloneQuestion = await withRetry(
      () =>
        questionChain.invoke({
          chatHistory,
          question: content,
        }),
      5,
      1000
    )
  } catch (error) {
    console.error('Error during OpenAI question generation:', error)
    throw new Error(
      'Îmi pare rău, dar nu am putut genera un răspuns în acest moment!'
    )
  }

  let retrievedContext: Document[] = []
  try {
    retrievedContext = await withRetry(
      () => retriever.getRelevantDocuments(content),
      2,
      1000
    )
    console.log('Retrieved context from Supabase:', retrievedContext)
  } catch (error) {
    console.error('Error retrieving documents from Supabase:', error)
    throw new Error('Could not retrieve documents from Supabase.')
  }

  const serializedContext = formatDocumentsAsString(retrievedContext)
  console.log('Serialized context length:', serializedContext.length)

  let answer
  console.time('Answer Generation Time')
  try {
    const answerChain = answerPrompt.pipe(chatModel)
    console.log('Attempting to generate answer with the following data:', {
      chatHistory,
      retrievedContext: serializedContext,
      question: standaloneQuestion.text,
    })
    answer = await withRetry(
      () =>
        answerChain.invoke({
          chatHistory,
          retrievedContext: serializedContext,
          question: standaloneQuestion.text,
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
