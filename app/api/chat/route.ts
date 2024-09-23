import { retriever } from '@/lib/chat/retreiver'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'

export async function POST(req: Request) {
  try {
    // Step 1: Receive the request
    const { content } = await req.json()
    console.log('Received user message:', content)

    if (!content) {
      return new Response(
        JSON.stringify({ message: 'Bad Request: Missing content' }),
        { status: 400 }
      )
    }

    // Step 2: Test Supabase document retrieval
    let retrievedContext
    try {
      retrievedContext = await retriever.getRelevantDocuments(content)
      console.log('Retrieved context from Supabase:', retrievedContext)
    } catch (error) {
      console.error('Error retrieving documents from Supabase:', error)
      return new Response(
        JSON.stringify({ message: 'Error retrieving documents from Supabase' }),
        { status: 500 }
      )
    }

    // Step 3: Test OpenAI connection for question generation
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing OpenAI API key')
    }

    const chatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      model: 'gpt-4o-mini-2024-07-18',
      temperature: 0,
      timeout: 10000,
    })

    const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert with over 30 years of experience in labor law. Answer in Romanian.
      ------------
      Question: {question}
    `)

    let generatedResponse
    try {
      const questionChain = prompt.pipe(chatModel)
      generatedResponse = await questionChain.invoke({ question: content })
      console.log('Generated response from OpenAI:', generatedResponse)
    } catch (error) {
      console.error('Error generating response from OpenAI:', error)
      return new Response(
        JSON.stringify({ message: 'Error generating response from OpenAI' }),
        { status: 500 }
      )
    }

    // Step 4: Return a simple response
    return new Response(JSON.stringify({ answer: generatedResponse.text }), {
      status: 200,
    })
  } catch (error: any) {
    console.error('Server Error:', error)
    return new Response(
      JSON.stringify({ message: 'Server Error: ' + error.message }),
      { status: 500 }
    )
  }
}
