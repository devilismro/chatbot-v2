const { readFileSync } = require("fs");
const path = require("path");
require("dotenv/config");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { createClient } = require("@supabase/supabase-js");
const { SupabaseVectorStore } = require("@langchain/community/vectorstores/supabase");
const { OpenAIEmbeddings } = require("@langchain/openai");

(async () => {
  try {
    const filePath = path.resolve(__dirname, "munca.txt");
    const text = readFileSync(filePath, "utf8");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", " ", ""],
    });

    const output = await splitter.createDocuments([text]);

    const documentsWithMetadata = output.map((doc) => {
      const isCase = doc.pageContent.includes("Hotărâre nr.");

      return {
        pageContent: doc.pageContent,
        metadata: {
          source: isCase ? "case" : "codul_muncii",
          
        },
      };
    });

    const sbApiKey = process.env.SUPABASE_KEY;
    const sbUrl = process.env.SUPABASE_URL;
    const openAIApiKey = process.env.OPENAI_API_KEY;

    if (!sbApiKey || !sbUrl || !openAIApiKey) {
      throw new Error(
        "Supabase/OpenAI environment variables not set. Please set them in the .env file"
      );
    }

    const embeddings = new OpenAIEmbeddings({ openAIApiKey });
    const supabaseClient = createClient(sbUrl, sbApiKey);

    await SupabaseVectorStore.fromDocuments(documentsWithMetadata, embeddings, {
      client: supabaseClient,
      tableName: "documents",
      queryName: "match_documents",
    });
    console.log("Success!");
  } catch (err) {
    console.log(err);
  }
})();
