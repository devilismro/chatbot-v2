import 'server-only';

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
} from 'ai/rsc';

import { ChatOpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { formatDocumentsAsString } from 'langchain/util/document';
import { Document } from '@langchain/core/documents';

import { spinner, BotMessage, SystemMessage } from '@/components/stocks';

import { serializeChatHistory } from './serializeChatHistory';
import { retriever } from './retreiver';
import { nanoid } from '@/lib/utils';
import { saveChat } from '@/app/actions';
import { auth } from '@/auth';

import ToolMessageComponent from '@/components/toolmessage';

type Chat = {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  messages: ChatMessage[];
  path: string;
};

type ToolContent = any; 

type ChatMessage = UserMessage | AssistantMessage | ToolMessage | SystemMessage;

interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
}

interface UserMessage extends BaseMessage {
  role: 'user';
  content: string;
}

interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  content: string;
}

interface ToolMessage extends BaseMessage {
  role: 'tool';
  content: ToolContent;
}

interface SystemMessage extends BaseMessage {
  role: 'system';
  content: string;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
  throw new Error('Failed to execute function after maximum retries');
}

const MAX_HISTORY_LENGTH = 10;
function truncateHistory(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-MAX_HISTORY_LENGTH);
}

const standaloneQuestionPrompt = ChatPromptTemplate.fromTemplate(`
Rolul tău:
Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Vei răspunde exclusiv în limba română, oferind informații clare, precise și detaliate.
------------ 
ISTORIC CONVERSAȚIE: {chatHistory}
------------ 
ÎNTREBARE URMĂTOARE: {question}
`);

const answerPrompt = ChatPromptTemplate.fromTemplate(`
Rolul tău:
Ești un expert cu peste 30 de ani de experiență practică în legislația muncii și dreptul muncii din România. Răspunde adaptat la contextul specific și includ exemple practice.
------------ 
CONTEXT: {retrievedContext}
------------ 
ISTORIC CONVERSAȚIE: {chatHistory}
------------ 
ÎNTREBARE: {question}
`);

async function submitUserMessage(content: string) {
  'use server';

  const aiState = getMutableAIState<typeof AI>();

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content,
      },
    ],
  });

  const truncatedChatHistory = truncateHistory(aiState.get().messages);
  const chatHistory = serializeChatHistory(truncatedChatHistory);
  console.log('Received user message:', content);
  console.log('Current chat history:', chatHistory);

  const chatModel = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini-2024-07-18',
    temperature: 0,
    timeout: 5000,
  });

  let standaloneQuestion;
  console.time('Standalone Question Generation Time');
  try {
    const questionChain = standaloneQuestionPrompt.pipe(chatModel);
    standaloneQuestion = await withRetry(
      () =>
        questionChain.invoke({
          chatHistory,
          question: content,
        }),
      5,
      1000
    );
    console.timeEnd('Standalone Question Generation Time');
    console.log('Standalone question generated:', standaloneQuestion.text);
  } catch (error) {
    console.error('Error during OpenAI question generation:', error);
    return {
      id: nanoid(),
      display: (
        <BotMessage content="Îmi pare rău, dar nu am putut genera un răspuns în acest moment!" />
      ),
    };
  }

  let retrievedContext: Document[] = [];
  console.time('Document Retrieval Time');
  try {
    retrievedContext = await withRetry(
      () => retriever.getRelevantDocuments(content),
      3,
      1000
    );
    console.timeEnd('Document Retrieval Time');
    console.log('Retrieved documents from Supabase:', retrievedContext);
  } catch (error) {
    console.error('Error retrieving documents from Supabase:', error);
  }

  const serializedContext = formatDocumentsAsString(retrievedContext);
  console.log('Serialized retrieved context:', serializedContext);

  let answer;
  console.time('Answer Generation Time');
  try {
    const answerChain = answerPrompt.pipe(chatModel);
    answer = await withRetry(
      () =>
        answerChain.invoke({
          chatHistory,
          retrievedContext: serializedContext,
          question: standaloneQuestion.text,
        }),
      5,
      1000
    );
    console.timeEnd('Answer Generation Time');
    console.log('Answer generated:', answer.text);
  } catch (error) {
    console.error('Error during OpenAI answer generation:', error);
    return {
      id: nanoid(),
      display: (
        <BotMessage content="Îmi pare rău, dar nu am putut genera un răspuns în acest moment!" />
      ),
    };
  }

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'assistant',
        content: answer.text,
      },
    ],
  });

  return { id: nanoid(), display: <BotMessage content={answer.text} /> };
}

export type AIState = {
  chatId: string;
  messages: ChatMessage[];
};

export type UIState = {
  id: string;
  display: React.ReactNode;
}[];

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server';
    const session = await auth();
    if (session && session.user) {
      const aiState = getAIState() as AIState;
      if (aiState) {
        const uiState = getUIStateFromAIState(aiState);
        return uiState;
      }
    } else {
      return;
    }
  },
  onSetAIState: async ({ state }) => {
    'use server';
    const session = await auth();
    if (session && session.user) {
      const { chatId, messages } = state;
      const createdAt = new Date();
      const userId = session.user.id as string;
      const path = `/chat/${chatId}`;

      const firstMessageContent = messages[0].content as string;
      const title = firstMessageContent.substring(0, 100);

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path,
      };

      await saveChat(chat);
    } else {
      return;
    }
  },
});

export const getUIStateFromAIState = (aiState: AIState) => {
  return aiState.messages
    .filter((message: ChatMessage) => message.role !== 'system')
    .map((message: ChatMessage, index: number) => {
      const id = `${aiState.chatId}-${index}`;
      let display: React.ReactNode = null;

      if (message.role === 'tool') {
        display = <ToolMessageComponent content={message.content} />;
      } else if (message.role === 'user' || message.role === 'assistant') {
        display = <BotMessage content={message.content} />;
      } else {
        display = null;
      }

      return { id, display };
    });
};
