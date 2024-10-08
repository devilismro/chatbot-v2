import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { formatDate } from '@/lib/utils'
import { getSharedChat } from '@/app/actions'
import { ChatList } from '@/components/chat-list'
import { FooterText } from '@/components/footer'
import { AI, UIState, getUIStateFromAIState } from '@/lib/chat/actions'
import { Chat } from '@/components/chat'
import { type ChatMessage } from '@/lib/types';

export const runtime = 'edge'
export const preferredRegion = 'home'


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

interface SharePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: SharePageProps): Promise<Metadata> {
  const chat = await getSharedChat(params.id)

  return {
    title: chat?.title.slice(0, 50) ?? 'Chat'
  }
}

export type AIState = {
  chatId: string;
  messages: ChatMessage[];
};


export default async function SharePage({ params }: SharePageProps) {
  const chat = await getSharedChat(params.id);

  if (!chat || !chat?.sharePath) {
    notFound();
  }

  const aiState: AIState = {
    chatId: chat.id,
    messages: chat.messages.map(message => ({
      ...message,
      content: transformMessageContentToString(message.content),
    })),
  };
  

  const uiState: UIState = getUIStateFromAIState(aiState);

  return (
    <>
      <div className="flex-1 space-y-6">
        <div className="border-b bg-background px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto max-w-2xl">
            <div className="space-y-1 md:-mx-8">
              <h1 className="text-2xl font-bold">{chat.title}</h1>
              <div className="text-sm text-muted-foreground">
                {formatDate(chat.createdAt)} · {chat.messages.length} mesaje
              </div>
            </div>
          </div>
        </div>
        <AI>
          <ChatList messages={uiState} isShared={true} />
        </AI>
      </div>
      <FooterText className="py-8" />
    </>
  );
}
