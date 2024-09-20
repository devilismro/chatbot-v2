import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { BufferMemory } from "langchain/memory";
import { retriever } from "/utils/retriever";
import { serializeChatHistory } from "/utils/serializeChatHistory";

document.addEventListener("submit", (e) => {
  e.preventDefault();
  runConversation();
});

const openAIApiKey = import.meta.env.OPENAI_API_KEY;

const memory = new BufferMemory({
  memoryKey: "chatHistory", 
  inputKey: "question", 
  outputKey: "response", 
  returnMessages: true, 
});


const standaloneQuestionPrompt = ChatPromptTemplate.fromTemplate(
  `Rolul tău:
Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Răspunzi exclusiv în limba română, oferind informații clare, precise și detaliate, adaptate la contextul specific. Include exemple practice atunci când este relevant. NU raspunzi la întrebari în afara Codului Muncii din Romania.

Acesta este istoricul conversației și întrebarea următoare:
------------
ISTORIC CONVERSAȚIE: {chatHistory}
------------
ÎNTREBARE URMĂTOARE: {question}
------------
Te rog să reformulezi întrebarea următoare ca o întrebare completă care poate fi înțeleasă independent:`
);

const answerPrompt = ChatPromptTemplate.fromTemplate(
  `Rolul tău:
Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Răspunzi exclusiv în limba română, oferind informații clare, precise și detaliate, adaptate la contextul specific. Include exemple practice atunci când este relevant. NU raspunzi la întrebari în afara Codului Muncii din Romania.

Acesta este istoricul conversației și întrebarea, împreună cu contextul relevant:
------------
CONTEXT: {retrievedContext}
------------  
ISTORIC CONVERSAȚIE: {chatHistory}
------------
ÎNTREBARE: {question}
------------
Te rog să răspunzi în detaliu, evaluând și încrederea răspunsului pe o scară procentuală în funcție de complexitatea întrebării. Procent de încredere:` 
);

const chatModel = new ChatOpenAI({ openAIApiKey, model: "gpt4o-mini" });

const questionChain = standaloneQuestionPrompt.pipe(chatModel);

const answerChain = answerPrompt.pipe(chatModel);

const performQuestionAnswering = async ({
  question,
  retrievedContext,
  chatHistory,
}) => {
  const chatHistoryString = chatHistory
    ? serializeChatHistory(chatHistory)
    : "";

  const standaloneQuestion = await questionChain.invoke({
    chatHistory: chatHistoryString,
    question: question,
  });

  const serializedContext = formatDocumentsAsString(retrievedContext);

  const answer = await answerChain.invoke({
    chatHistory: chatHistoryString,
    retrievedContext: serializedContext,
    question: standaloneQuestion.BaseMessage.content,  
  });

  await memory.saveContext({ question }, { text: answer.BaseMessage.content });

  return { result: answer.BaseMessage.content };
};

const chain = RunnableSequence.from([
  {
    question: (input) => input.question,
    chatHistory: async () => {
      const savedMemory = await memory.loadMemoryVariables({});
      const hasHistory = savedMemory.chatHistory && savedMemory.chatHistory.length > 0;
      return hasHistory ? savedMemory.chatHistory : [];
    },
    retrievedContext: async (input) =>
      retriever.getRelevantDocuments(input.question), 
  },
  performQuestionAnswering, 
]);

const runConversation = async () => {
  const userInput = document.getElementById("user-input");
  const question = userInput.value;
  userInput.value = ""; 

  const chatbotConversation = document.getElementById("chatbot-conversation-container");
  const newHumanSpeechBubble = document.createElement("div");
  newHumanSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newHumanSpeechBubble);
  newHumanSpeechBubble.textContent = question;
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

  const input = { question };
  const { result } = await chain.invoke(input);

  const newAiSpeechBubble = document.createElement("div");
  newAiSpeechBubble.classList.add("speech", "speech-ai");
  chatbotConversation.appendChild(newAiSpeechBubble);
  newAiSpeechBubble.textContent = result;
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
};
