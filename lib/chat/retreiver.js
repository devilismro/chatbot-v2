import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { OpenAIEmbeddings } from '@langchain/openai'
import { createClient } from '@supabase/supabase-js'

const openAIApiKey = process.env.OPENAI_API_KEY
const sbApiKey = process.env.SUPABASE_KEY
const sbUrl = process.env.SUPABASE_URL

if (!sbApiKey || !sbUrl || !openAIApiKey) {
  throw new Error(
    'Supabase/OpenAI environment variables not set. Please set them in the .env file.'
  )
}

const supabaseClient = createClient(sbUrl, sbApiKey)
const embeddings = new OpenAIEmbeddings({ openAIApiKey })

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: 'documents',
  queryName: 'match_documents'
})

const retriever = {
  async getRelevantDocuments(query) {
    try {
      console.log('Attempting to retrieve documents from Supabase...')
      console.time('SupabaseDocumentRetrieval')
      const documents = await vectorStore.similaritySearch(query, 3)
      console.timeEnd('SupabaseDocumentRetrieval')
      console.log('Retrieved documents:', documents)
      return documents
    } catch (error) {
      console.error('Error searching for documents:', error)
      throw new Error('Error retrieving documents from Supabase.')
    }
  }
}

export { retriever };
