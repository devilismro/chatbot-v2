import { type Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { getChat, getMissingKeys } from '@/app/actions';
import { Chat } from '@/components/chat';
import { AI } from '@/lib/chat/actions';
import { Session } from '@/lib/types';

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
  content: any;  
}

interface SystemMessage extends BaseMessage {
  role: 'system';
  content: string;
}

export interface ChatPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: ChatPageProps): Promise<Metadata> {
  const session = await auth();

  if (!session?.user) {
    return {};
  }

  const chat = await getChat(params.id, session.user.id);

  if (!chat || 'error' in chat) {
    redirect('/');
  } else {
    return {
      title: chat?.title.toString().slice(0, 50) ?? 'Chat',
    };
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = (await auth()) as Session;
  const missingKeys = await getMissingKeys();

  if (!session?.user) {
    redirect(`/login?next=/chat/${params.id}`);
  }

  const userId = session.user.id as string;
  const chat = await getChat(params.id, userId);

  if (!chat || 'error' in chat) {
    redirect('/');
  } else {
    if (chat?.userId !== session?.user?.id) {
      notFound();
    }

    const transformMessageContentToString = (content: any): string => {
      if (Array.isArray(content)) {
        return content
          .map(part => {
            if (part.type === 'text') {
              return part.value;
            } else if (part.type === 'image') {
              return '[Image]';
            }
            return '';
          })
          .join(' ');
      }
      return typeof content === 'string' ? content : '';
    };

    const transformedMessages: ChatMessage[] = chat.messages.map(message => ({
      ...message,
      content: transformMessageContentToString(message.content),
    }));

    return (
      <AI initialAIState={{ chatId: chat.id, messages: transformedMessages }}>
        <Chat
          id={chat.id}
          session={session}
          initialMessages={transformedMessages}
          missingKeys={missingKeys}
        />
      </AI>
    );
  }
}
